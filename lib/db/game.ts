/**
 * Game data layer — the single place where the (still untyped in
 * database.types.ts) game tables + RPCs are touched, so `as any` lives here
 * and nowhere else. All spins go through the atomic `play_game` RPC.
 */
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getDesignSettings, resolveAccent, resolveGradient, isDesignId, type DesignId } from '@/lib/design-settings'
import { DEFAULT_PRESENCE } from '@/lib/game'
import type { PlayResult, GameGate, PresenceConfig, PresenceSummary } from '@/lib/game'

export const FALLBACK_ACCENT = '#F47B20'

/**
 * True when an RPC/table is missing from the database. A missing function
 * surfaces as PostgREST `PGRST202` ("could not find the function in the schema
 * cache"), a missing table as `PGRST205`, and raw Postgres as `42883`/`42P01`.
 * We map these to a friendly "setup" state instead of a generic server error.
 */
export function isMissingRpc(error: any): boolean {
  if (!error) return false
  const code = error.code
  if (code === 'PGRST202' || code === 'PGRST205' || code === '42883' || code === '42P01') return true
  return /could not find the function|does not exist|schema cache/i.test(error.message || '')
}

/** Accent for a business: modern design override/built-in, else primary_color. */
export function businessAccent(business: any): string {
  const theme = business?.theme_id
  if (theme && typeof theme === 'string' && isDesignId(theme)) {
    return resolveAccent(getDesignSettings(business, theme as DesignId), theme as DesignId)
  }
  return business?.primary_color || FALLBACK_ACCENT
}

/**
 * The business's resolved brand GRADIENT (CSS) — the same one the public menu
 * uses (custom gradient → flat accent sweep → brand default). Lets the
 * gamification surfaces (wheel button, game page, account) match the menu
 * instead of staying flat orange.
 */
export function businessGradient(business: any): string {
  const theme = business?.theme_id
  if (theme && typeof theme === 'string' && isDesignId(theme)) {
    return resolveGradient(getDesignSettings(business, theme as DesignId), theme as DesignId)
  }
  const c = business?.primary_color || FALLBACK_ACCENT
  return `linear-gradient(135deg, ${c}, ${c})`
}

export interface GameConfig {
  active: boolean
  loyaltyActive: boolean
  businessName: string
  prizes: string[]
  accent: string
  gradient: string
  /** "Conditions pour jouer" — gates the player must clear before spinning. */
  gates: GameGate[]
  /** Sanitized presence rule (NO ips/coords) so the client knows whether to ask for GPS. */
  presence: PresenceSummary
}

/** Public wheel config for /[slug]/jeu and the menu FAB. Tolerates missing tables. */
export async function loadGameConfig(slug: string): Promise<GameConfig> {
  const off: GameConfig = { active: false, loyaltyActive: false, businessName: '', prizes: [], accent: FALLBACK_ACCENT, gradient: 'linear-gradient(135deg, #F47B20, #F5B82E)', gates: [], presence: { enabled: false, mode: 'ip' } }
  try {
    const supabase: any = await createServiceRoleClient()
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, slug, status, theme_id, primary_color, design_settings')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle()
    if (!business) return off
    const accent = businessAccent(business)
    const gradient = businessGradient(business)

    const { data: game } = await supabase
      .from('games')
      .select('id, config')
      .eq('business_id', business.id)
      .eq('type', 'roulette')
      .eq('active', true)
      .maybeSingle()

    let prizes: string[] = []
    let gates: GameGate[] = []
    let presence: PresenceSummary = { enabled: false, mode: 'ip' }
    if (game) {
      const { data: rows } = await supabase
        .from('prizes')
        .select('label')
        .eq('game_id', game.id)
        .eq('active', true)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
      prizes = (rows || []).map((p: any) => p.label)

      // Only enabled gates with usable config reach the player (no answers/keys).
      const g = (game as any).config?.gates
      if (g && g.enabled && Array.isArray(g.items)) {
        gates = g.items
          .filter((it: any) =>
            it && it.enabled && (it.type === 'survey'
              ? Array.isArray(it.questions) && it.questions.length > 0
              : typeof it.url === 'string' && it.url.trim() !== ''))
          .map((it: any) => ({
            id: String(it.id),
            type: it.type,
            label: String(it.label || ''),
            enabled: true,
            url: it.url,
            questions: it.type === 'survey' ? it.questions : undefined,
          }))
      }

      // Sanitized presence summary — only enabled+mode reach the client.
      const p = (game as any).config?.presence
      if (p && typeof p === 'object') {
        presence = { enabled: Boolean(p.enabled), mode: p.mode === 'geo' || p.mode === 'both' ? p.mode : 'ip' }
      }
    }

    const { data: program } = await supabase
      .from('loyalty_programs')
      .select('business_id')
      .eq('business_id', business.id)
      .eq('active', true)
      .maybeSingle()

    return {
      active: Boolean(game) && prizes.length > 0,
      loyaltyActive: Boolean(program),
      businessName: business.name,
      prizes,
      accent,
      gradient,
      gates,
      presence,
    }
  } catch (e: any) {
    console.error('loadGameConfig:', e?.message)
    return off
  }
}

/** Spin atomically via the play_game RPC. */
export async function playGame(slug: string, deviceId: string | null, phone: string | null): Promise<PlayResult> {
  try {
    const supabase: any = await createServiceRoleClient()
    const { data, error } = await supabase.rpc('play_game', { p_slug: slug, p_device: deviceId, p_phone: phone })
    if (error) {
      if (isMissingRpc(error)) return { ok: false, error: 'setup' }
      console.error('play_game rpc:', error.message)
      return { ok: false, error: 'server' }
    }
    return (data as PlayResult) ?? { ok: false, error: 'server' }
  } catch (e: any) {
    console.error('playGame:', e?.message)
    return { ok: false, error: 'server' }
  }
}

/** Coerce a stored games.config.presence blob into a safe, complete PresenceConfig. */
export function normalizePresence(raw: any): PresenceConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_PRESENCE
  const mode = raw.mode === 'geo' || raw.mode === 'both' ? raw.mode : 'ip'
  const ips = Array.isArray(raw.ips) ? raw.ips.map((x: any) => String(x).trim()).filter(Boolean) : []
  const geo =
    raw.geo && typeof raw.geo === 'object' && typeof raw.geo.lat === 'number' && typeof raw.geo.lng === 'number'
      ? { lat: raw.geo.lat, lng: raw.geo.lng, radiusM: Number(raw.geo.radiusM) > 0 ? Number(raw.geo.radiusM) : 150 }
      : null
  return {
    enabled: Boolean(raw.enabled),
    mode,
    ips,
    geo,
    message: typeof raw.message === 'string' ? raw.message : '',
    alsoRedeem: Boolean(raw.alsoRedeem),
  }
}

/**
 * FULL presence config (incl. ips/coords) for a business's active roulette —
 * SERVER-ONLY, used to enforce the gate. Never send this to the client; the
 * public summary lives in loadGameConfig().presence.
 */
export async function loadPresence(slug: string): Promise<PresenceConfig> {
  try {
    const supabase: any = await createServiceRoleClient()
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle()
    if (!business) return DEFAULT_PRESENCE
    const { data: game } = await supabase
      .from('games')
      .select('config')
      .eq('business_id', business.id)
      .eq('type', 'roulette')
      .eq('active', true)
      .maybeSingle()
    return normalizePresence((game as any)?.config?.presence)
  } catch (e: any) {
    console.error('loadPresence:', e?.message)
    return DEFAULT_PRESENCE
  }
}
