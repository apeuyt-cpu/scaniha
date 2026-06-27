/**
 * Diner-account data layer — GLOBAL identity (one phone = one account = one
 * 4-digit PIN, recognized at EVERY café). Wraps the SECURITY DEFINER RPCs from
 * supabase/accounts_global.sql. The PIN travels as the `password` arg (the column
 * is still password_hash). Identity is global; per-café loyalty DATA is scoped by
 * slug at the game/loyalty routes. The API route is the auth boundary; the single
 * `as any` for the untyped service client lives here.
 */
import { createServiceRoleClient } from '@/lib/supabase/server'
import { isMissingRpc } from '@/lib/db/game'
import { normPhone } from '@/lib/db/loyalty'

export type AccountResult =
  | { ok: true; token: string; phone: string; name: string | null }
  | { ok: false; error: string; suggestLogin?: boolean }

export type SessionResult = { ok: true; phone: string; name: string | null } | { ok: false }

/** Map an RPC error key to a French message for the diner. */
const SIGNUP_MSG: Record<string, string> = {
  phone: 'Entrez un numéro de téléphone valide.',
  weak: 'Choisissez un code à 4 chiffres.',
  exists: 'Ce numéro ne peut pas être inscrit. Si vous avez déjà un compte, connectez-vous avec votre code à 4 chiffres.',
  no_business: 'Établissement introuvable.',
}
const LOGIN_MSG: Record<string, string> = {
  invalid: 'Numéro ou code incorrect.',
  locked: 'Trop de tentatives. Réessayez dans quelques minutes.',
  no_business: 'Établissement introuvable.',
}

/**
 * Create a GLOBAL account (one per phone). `slug` is OPTIONAL: pass it when the
 * diner signs up from a specific café's hub so that café's welcome bonus is
 * granted; omit it for the café-less wallet signup. Identity is global either way.
 */
export async function dinerSignup(phoneRaw: string, password: string, name?: string, slug?: string): Promise<AccountResult> {
  const phone = normPhone(phoneRaw)
  if (!phone) return { ok: false, error: SIGNUP_MSG.phone }
  if (!/^[0-9]{4}$/.test(password || '')) return { ok: false, error: SIGNUP_MSG.weak }
  try {
    const supabase: any = await createServiceRoleClient()
    const { data, error } = await supabase.rpc('diner_signup', { p_phone: phone, p_password: password, p_name: name || null, p_slug: slug || null })
    if (error) {
      if (isMissingRpc(error)) return { ok: false, error: 'Les comptes ne sont pas encore configurés.' }
      console.error('diner_signup rpc:', error.message)
      return { ok: false, error: 'Une erreur est survenue. Réessayez.' }
    }
    if (!data?.ok) return { ok: false, error: SIGNUP_MSG[data?.error] || 'Inscription impossible.', ...(data?.error === 'exists' ? { suggestLogin: true } : {}) }
    return { ok: true, token: data.token, phone: data.phone, name: data.name ?? null }
  } catch (e: any) {
    console.error('dinerSignup:', e?.message)
    return { ok: false, error: 'Connexion impossible. Vérifiez votre réseau.' }
  }
}

/** Log in by phone + PIN — GLOBAL (no café context; the token is valid everywhere). */
export async function dinerLogin(phoneRaw: string, password: string): Promise<AccountResult> {
  const phone = normPhone(phoneRaw)
  if (!phone || !password) return { ok: false, error: LOGIN_MSG.invalid }
  try {
    const supabase: any = await createServiceRoleClient()
    const { data, error } = await supabase.rpc('diner_login', { p_phone: phone, p_password: password })
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
    // Global identity — the token resolves the customer's phone/name regardless of
    // café. Per-café data access is scoped by the slug's business at each route.
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
