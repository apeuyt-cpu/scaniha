import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type UserRole = 'owner' | 'super_admin' | null

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = ['/login', '/signup', '/verify-email', '/']

/**
 * Check if a path is a public route
 */
function isPublicRoute(pathname: string): boolean {
  if (pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/verify-email')) return true
  if (pathname === '/') return true
  // Public menu routes (slug routes)
  if (pathname.match(/^\/[^\/]+$/) && !pathname.startsWith('/admin') && !pathname.startsWith('/super-admin')) {
    return true
  }
  return false
}

/**
 * Distinguish a TRANSIENT infrastructure/network error (Supabase unreachable,
 * fetch failed, timeout, 5xx) from a DEFINITIVE auth failure (no/invalid
 * session). We must never log a valid session out over a transient hiccup —
 * that is the "sometimes I get kicked to /login" bug.
 */
function isRetryable(error: any): boolean {
  if (!error) return false
  const name = String(error.name || '')
  const msg = String(error.message || '').toLowerCase()
  const status = error.status
  // Definitive "no / invalid session" → never retry, treat as unauthenticated.
  if (name.includes('SessionMissing') || msg.includes('session missing') || msg.includes('not authenticated')) return false
  if (status === 400 || status === 401 || status === 403) return false
  // Transient infra / network → retry, then fail open.
  if (name.includes('Retryable') || name === 'TypeError') return true
  if (
    msg.includes('fetch failed') || msg.includes('network') || msg.includes('timeout') ||
    msg.includes('econnreset') || msg.includes('socket') || msg.includes('und_err') ||
    msg.includes('enotfound') || msg.includes('eai_again')
  ) return true
  if (status == null || status === 0 || status >= 500) return true
  return false
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Validate the session, retrying transient network failures.
 * Returns `transient: true` when we could not reach the auth service (so the
 * caller should fail OPEN instead of redirecting a valid session to /login).
 */
async function getUserWithRetry(
  supabase: ReturnType<typeof createSupabaseServerClient>
): Promise<{ user: { id: string } | null; transient: boolean }> {
  let lastError: any = null
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase.auth.getUser()
    if (data?.user && !error) return { user: data.user, transient: false }
    lastError = error
    if (error && !isRetryable(error)) return { user: null, transient: false }
    if (attempt < 2) await sleep(150 * (attempt + 1))
  }
  return { user: null, transient: isRetryable(lastError) }
}

/**
 * Fetch the user's role, retrying transient failures.
 * `errored: true` means we couldn't determine the role (transient) — the caller
 * should fail OPEN for an already-authenticated user rather than kicking to login.
 */
async function getUserRole(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string
): Promise<{ role: UserRole; errored: boolean }> {
  let lastError: any = null
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()
    if (!error) return { role: (profile?.role as UserRole) || null, errored: false }
    lastError = error
    if (!isRetryable(error)) return { role: null, errored: false }
    if (attempt < 2) await sleep(150 * (attempt + 1))
  }
  return { role: null, errored: isRetryable(lastError) }
}

function getDashboardUrl(role: UserRole): string {
  switch (role) {
    case 'super_admin':
      return '/super-admin'
    case 'owner':
      return '/admin'
    default:
      return '/login'
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  let response = NextResponse.next({ request: { headers: req.headers } })

  const supabase = createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: req.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: req.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Validates the session and refreshes the cookie when needed (with retry on
  // transient network errors so a flaky connection never logs the user out).
  const { user, transient } = await getUserWithRetry(supabase)

  const redirectTo = (path: string, status = 307) => {
    const url = req.nextUrl.clone()
    url.pathname = path
    url.search = ''
    const r = NextResponse.redirect(url, status)
    response.cookies.getAll().forEach((c) => r.cookies.set(c.name, c.value))
    return r
  }

  // Send an unauthenticated visitor to /login, remembering where they were
  // headed (?next=…) so we bounce them back after sign-in — the staff-QR flow.
  const redirectToLogin = () => {
    const url = req.nextUrl.clone()
    const dest = pathname + (req.nextUrl.search || '')
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', dest)
    const r = NextResponse.redirect(url, 307)
    response.cookies.getAll().forEach((c) => r.cookies.set(c.name, c.value))
    return r
  }

  // A `next` target is only honoured when it's an internal path inside the user's
  // own area — prevents open-redirects and cross-role jumps.
  const safeNext = (next: string | null, r: UserRole): string | null => {
    if (!next || !next.startsWith('/') || next.startsWith('//')) return null
    if (r === 'owner') return next.startsWith('/admin') ? next : null
    if (r === 'super_admin') return next.startsWith('/super-admin') ? next : null
    return null
  }

  // Authenticated user landing on login/signup → send them where they were
  // headed (?next=…) or to their dashboard.
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const { role, errored } = await getUserRole(supabase, user.id)
    // If we can't resolve the role right now, just let them sit on the page
    // rather than risk a redirect loop.
    if (!errored) {
      const dest = safeNext(req.nextUrl.searchParams.get('next'), role) || getDashboardUrl(role)
      if (dest !== pathname && dest !== '/login') {
        return redirectTo(dest, 302)
      }
    }
    return response
  }

  // Public routes are always allowed.
  if (isPublicRoute(pathname)) {
    return response
  }

  // Protected route, no valid user.
  if (!user) {
    // Transient infra error (Supabase unreachable) — DO NOT log a valid session
    // out. Let the request through; the page's own server guard re-checks once
    // Supabase is reachable, and surfaces a retry instead of a forced logout.
    if (transient) return response
    return redirectToLogin()
  }

  // Authenticated — resolve role (retrying transient failures).
  const { role, errored } = await getUserRole(supabase, user.id)
  // Couldn't determine the role due to a transient error → fail OPEN for an
  // already-authenticated user. The page guard will enforce the role properly.
  if (errored) return response

  // Protect /admin — owners only, EXCEPT a super-admin "acting as" a business
  // ("Gérer comme l'établissement"): the sa_business cookie lets them use the
  // real owner admin for it. (Cookie name mirrors lib/admin-impersonation.ts;
  // not imported here because middleware runs on the edge.)
  if (pathname.startsWith('/admin') && role !== 'owner') {
    const saImpersonating = role === 'super_admin' && Boolean(req.cookies.get('sa_business')?.value)
    if (!saImpersonating) {
      return redirectTo(role === 'super_admin' ? '/super-admin' : '/login')
    }
  }

  // Protect /super-admin — super_admin only (block owners).
  if (pathname.startsWith('/super-admin') && role !== 'super_admin') {
    return redirectTo(role === 'owner' ? '/admin' : '/login')
  }

  return response
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/super-admin',
    '/super-admin/:path*',
    '/login',
    '/signup',
    '/verify-email',
  ],
}
