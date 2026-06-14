/**
 * Diner-account data layer (phone + password, per business). Wraps the
 * SECURITY DEFINER RPCs from supabase/accounts.sql. The API route is the auth
 * boundary; the single `as any` for the untyped service client lives here.
 */
import { createServiceRoleClient } from '@/lib/supabase/server'
import { isMissingRpc } from '@/lib/db/game'
import { normPhone } from '@/lib/db/loyalty'

export type AccountResult =
  | { ok: true; token: string; phone: string; name: string | null }
  | { ok: false; error: string }

export type SessionResult = { ok: true; phone: string; name: string | null } | { ok: false }

/** Map an RPC error key to a French message for the diner. */
const SIGNUP_MSG: Record<string, string> = {
  phone: 'Entrez un numéro de téléphone valide.',
  weak: 'Le mot de passe doit contenir au moins 6 caractères.',
  exists: 'Un compte existe déjà avec ce numéro. Connectez-vous.',
  no_business: 'Établissement introuvable.',
}
const LOGIN_MSG: Record<string, string> = {
  invalid: 'Numéro ou mot de passe incorrect.',
  no_business: 'Établissement introuvable.',
}

export async function dinerSignup(slug: string, phoneRaw: string, password: string, name?: string): Promise<AccountResult> {
  const phone = normPhone(phoneRaw)
  if (!phone) return { ok: false, error: SIGNUP_MSG.phone }
  if (!password || password.length < 6) return { ok: false, error: SIGNUP_MSG.weak }
  try {
    const supabase: any = await createServiceRoleClient()
    const { data, error } = await supabase.rpc('diner_signup', { p_slug: slug, p_phone: phone, p_password: password, p_name: name || null })
    if (error) {
      if (isMissingRpc(error)) return { ok: false, error: 'Les comptes ne sont pas encore configurés.' }
      console.error('diner_signup rpc:', error.message)
      return { ok: false, error: 'Une erreur est survenue. Réessayez.' }
    }
    if (!data?.ok) return { ok: false, error: SIGNUP_MSG[data?.error] || 'Inscription impossible.' }
    return { ok: true, token: data.token, phone: data.phone, name: data.name ?? null }
  } catch (e: any) {
    console.error('dinerSignup:', e?.message)
    return { ok: false, error: 'Connexion impossible. Vérifiez votre réseau.' }
  }
}

export async function dinerLogin(slug: string, phoneRaw: string, password: string): Promise<AccountResult> {
  const phone = normPhone(phoneRaw)
  if (!phone || !password) return { ok: false, error: LOGIN_MSG.invalid }
  try {
    const supabase: any = await createServiceRoleClient()
    const { data, error } = await supabase.rpc('diner_login', { p_slug: slug, p_phone: phone, p_password: password })
    if (error) {
      if (isMissingRpc(error)) return { ok: false, error: 'Les comptes ne sont pas encore configurés.' }
      console.error('diner_login rpc:', error.message)
      return { ok: false, error: 'Une erreur est survenue. Réessayez.' }
    }
    if (!data?.ok) return { ok: false, error: LOGIN_MSG[data?.error] || LOGIN_MSG.invalid }
    return { ok: true, token: data.token, phone: data.phone, name: data.name ?? null }
  } catch (e: any) {
    console.error('dinerLogin:', e?.message)
    return { ok: false, error: 'Connexion impossible. Vérifiez votre réseau.' }
  }
}

/** Validate a session token → the account's phone/name, or {ok:false}. */
export async function dinerSession(token: string | null | undefined): Promise<SessionResult> {
  if (!token || typeof token !== 'string') return { ok: false }
  try {
    const supabase: any = await createServiceRoleClient()
    const { data, error } = await supabase.rpc('diner_session', { p_token: token })
    if (error || !data?.ok) return { ok: false }
    return { ok: true, phone: data.phone, name: data.name ?? null }
  } catch {
    return { ok: false }
  }
}

export async function dinerLogout(token: string | null | undefined): Promise<void> {
  if (!token) return
  try {
    const supabase: any = await createServiceRoleClient()
    await supabase.rpc('diner_logout', { p_token: token })
  } catch {
    /* best-effort */
  }
}
