import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type UserRole = 'owner' | 'super_admin' | null

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = ['/login', '/signup', '/']

/**
 * Check if a path is a public route
 */
function isPublicRoute(pathname: string): boolean {
  // Allow login and signup
  if (pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    return true
  }
  
  // Allow root path
  if (pathname === '/') {
    return true
  }
  
  // Allow public menu routes (slug routes)
  if (pathname.match(/^\/[^\/]+$/) && !pathname.startsWith('/admin') && !pathname.startsWith('/super-admin')) {
    return true
  }
  
  return false
}

/**
 * Get user role from profile
 */
async function getUserRole(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string
): Promise<UserRole> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()
    
    return (profile?.role as UserRole) || null
  } catch (error) {
    return null
  }
}

/**
 * Get the correct dashboard URL for a role
 */
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
  
  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }
  
  // Create Supabase client for middleware
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  // Get user role
  const userRole = await getUserRole(supabase, user.id)

  // Protect /admin routes - only allow owners
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'owner') {
      const redirectUrl = req.nextUrl.clone()
      
      // Redirect super_admin to their dashboard
      if (userRole === 'super_admin') {
        redirectUrl.pathname = '/super-admin'
        return NextResponse.redirect(redirectUrl, 307)
      }
      
      // Redirect others to login
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl, 307)
    }
  }

  // Protect /super-admin routes - only allow super_admin
  // CRITICAL: Block owners from accessing super-admin
  if (pathname.startsWith('/super-admin')) {
    if (userRole === 'owner') {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/admin'
      return NextResponse.redirect(redirectUrl, 307)
    }
    
    if (userRole !== 'super_admin') {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl, 307)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/super-admin',
    '/super-admin/:path*',
  ],
}
