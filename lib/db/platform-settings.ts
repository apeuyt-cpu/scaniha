// Global platform settings (key/value JSON), super-admin controlled.
// Read/written ONLY via the service-role client — the table is RLS-on with no
// policies, so anon/auth roles get nothing. CALLERS that WRITE must gate with
// requireSuperAdmin first; reads are safe to run from public server components
// (they only expose the resolved boolean, not the row).

import { createServiceRoleClient } from '@/lib/supabase/server'

/** Read a setting's JSON value (null if missing or on any error). */
export async function getSetting<T = any>(key: string): Promise<T | null> {
  try {
    const svc: any = await createServiceRoleClient()
    const { data } = await svc.from('platform_settings').select('value').eq('key', key).maybeSingle()
    return (data?.value ?? null) as T | null
  } catch {
    return null
  }
}

/** Upsert a setting's JSON value (super-admin gate before calling). */
export async function setSetting(key: string, value: any): Promise<void> {
  const svc: any = await createServiceRoleClient()
  const { error } = await svc
    .from('platform_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw new Error(error.message)
}

const SELF_SIGNUP_KEY = 'self_signup'

/**
 * Whether public visitors may create their own account (/signup) vs. having to
 * go through the request form (/business-request → super-admin provisions).
 * Falls back to the NEXT_PUBLIC_SELF_SIGNUP env flag until the toggle is set,
 * so existing behaviour is preserved on a fresh DB.
 */
export async function isSelfSignupEnabled(): Promise<boolean> {
  const v = await getSetting<{ enabled?: boolean }>(SELF_SIGNUP_KEY)
  if (v && typeof v.enabled === 'boolean') return v.enabled
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return true
  return process.env.NEXT_PUBLIC_SELF_SIGNUP === 'on'
}

export async function setSelfSignupEnabled(enabled: boolean): Promise<void> {
  await setSetting(SELF_SIGNUP_KEY, { enabled })
}
