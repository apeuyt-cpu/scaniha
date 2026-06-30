import { cache } from 'react'
import { createServerClient } from './supabase/server'
import { redirect } from 'next/navigation'
import type { Database } from './supabase/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getImpersonatedBusinessId } from './admin-impersonation'

type Profile = Database['public']['Tables']['profiles']['Row']
type UserRole = 'owner' | 'super_admin'
type SupabaseClientType = Awaited<ReturnType<typeof createServerClient>>

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * TRANSIENT infra/network error (Supabase unreachable, fetch failed, timeout,
 * 5xx) vs a DEFINITIVE auth failure (no/invalid session). We retry the former
 * and NEVER log a valid session out over it.
 */
function isRetryableAuthError(error: any): boolean {
  if (!error) return false
  const name = String(error.name || '')
  const msg = String(error.message || '').toLowerCase()
  const status = error.status
  if (name.includes('SessionMissing') || msg.includes('session missing') || msg.includes('not authenticated')) return false
  if (status === 400 || status === 401 || status === 403) return false
  if (name.includes('Retryable') || name === 'TypeError') return true
  if (
    msg.includes('fetch failed') || msg.includes('network') || msg.includes('timeout') ||
    msg.includes('econnreset') || msg.includes('socket') || msg.includes('und_err') ||
    msg.includes('enotfound') || msg.includes('eai_again')
  ) return true
  if (status == null || status === 0 || status >= 500) return true
  return false
}

interface AuthResult {
  user: { id: string; email?: string }
  supabase: SupabaseClientType
  profile: Profile
}

/**
 * Get the current authenticated user
 * Redirects to login if not authenticated
 */
export async function getAuthUser() {
  const supabase = await createServerClient()

  let lastError: any = null
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (user && !error) return { user, supabase }
    lastError = error
    // Definitive "no/invalid session" → stop and send to login.
    if (error && !isRetryableAuthError(error)) break
    if (attempt < 2) await sleep(200 * (attempt + 1))
  }

  // Transient infra failure → surface an error (the error boundary offers a
  // retry) instead of logging a valid session out to /login.
  if (lastError && isRetryableAuthError(lastError)) {
    throw new Error('AUTH_SERVICE_UNAVAILABLE')
  }
  redirect('/login')
}

/**
 * Get user profile with role information
 * Redirects to login if profile not found
 */
export async function getUserProfile(userId: string, supabase: SupabaseClientType) {
  let lastError: any = null
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (!error) {
      if (profile) return profile
      // Authenticated but no profile row — a genuine data issue; login can't fix it.
      console.error(`[AUTH] Profile not found for user ${userId}`)
      redirect('/login')
    }

    lastError = error
    if (!isRetryableAuthError(error)) break
    if (attempt < 2) await sleep(200 * (attempt + 1))
  }

  // Transient DB error → surface for retry; never bounce a valid session to /login.
  console.error('[AUTH] Profile fetch error:', lastError)
  throw new Error('PROFILE_SERVICE_UNAVAILABLE')
}

/**
 * Get the correct dashboard URL for a user role
 */
export function getDashboardUrl(role: UserRole | null): string {
  switch (role) {
    case 'super_admin':
      return '/super-admin'
    case 'owner':
      return '/admin'
    default:
      return '/login'
  }
}

/**
 * Require authentication - returns user and supabase client
 * Redirects to login if not authenticated
 */
export async function requireAuth(): Promise<AuthResult> {
  const { user, supabase } = await getAuthUser()
  const profile = await getUserProfile(user.id, supabase)
  
  return { user, supabase, profile }
}

/**
 * Require owner role - redirects to appropriate dashboard if wrong role
 * Only owners can access this
 */
export async function requireOwner(): Promise<AuthResult> {
  const { user, supabase, profile } = await requireAuth()

  // Super-admins are normally bounced to their own dashboard — EXCEPT when they
  // are "acting as" a business ("Gérer comme l'établissement"): then they use the
  // real owner admin for it. The impersonation cookie is only ever honoured for a
  // server-verified super_admin, so this is not a privilege escalation.
  if (profile.role === 'super_admin') {
    const impersonating = await getImpersonatedBusinessId()
    if (impersonating) return { user, supabase, profile }
    redirect('/super-admin')
  }

  // Only allow owners
  if (profile.role !== 'owner') {
    console.error(`[AUTH] User ${user.id} has role '${profile.role}', expected 'owner'`)
    redirect('/login')
  }
  
  return { user, supabase, profile }
}

/**
 * Require super_admin role - redirects to appropriate dashboard if wrong role
 * Only super_admins can access this
 */
export async function requireSuperAdmin(): Promise<AuthResult> {
  const { user, supabase, profile } = await requireAuth()
  
  // CRITICAL: Block owners from accessing super-admin routes
  if (profile.role === 'owner') {
    console.warn(`[AUTH] Owner ${user.id} attempted to access super-admin. Redirecting to /admin`)
    redirect('/admin')
  }
  
  // Only allow super_admin
  if (profile.role !== 'super_admin') {
    console.error(`[AUTH] User ${user.id} has role '${profile.role}', expected 'super_admin'`)
    redirect('/login')
  }
  
  return { user, supabase, profile }
}

/**
 * Get current user (non-blocking, returns null if not authenticated)
 * Useful for components that need to check auth state without redirecting
 */
export async function getCurrentUser() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}

/**
 * Get current user profile (non-blocking, returns null if not authenticated)
 *
 * Memoized per-request with React's cache(): the current user + profile read is
 * resolved once per server request even if several server components ask for it,
 * removing the redundant Supabase auth + profile round-trips. cache() scopes the
 * memo to ONE request — no cross-request leakage. Return shape and behaviour are
 * unchanged (still returns null on no session / error).
 */
export const getCurrentProfile = cache(async () => {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    return profile
  } catch {
    return null
  }
})
