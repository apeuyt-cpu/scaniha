/**
 * Game data layer — the single place where the (still untyped in
 * database.types.ts) game tables + RPCs are touched, so `as any` lives here
 * and nowhere else. All spins go through the atomic `play_game` RPC.
 */
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getDesignSettings, resolveAccent, resolveGradient, isDesignId, isFidelityLive, type DesignId } from '@/lib/design-settings'
import { DEFAULT_QR_GATE, gameCooldownHours } from '@/lib/game'
import type { PlayResult, GameGate, QrGateConfig, QrGateSummary } from '@/lib/game'

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
  /** Welcome bonus credited at signup (0 when loyalty is off) — shown as the join hook. */
  welcomePoints: number
  accent: string
  gradient: string
  /** "Conditions pour jouer" — gates the player must clear before spinning. */
  gates: GameGate[]
  /** Sanitized QR-gate summary (NO key) — tells the client whether a scan is required. */
  qrGate: QrGateSummary
}

/** Public wheel config for /[slug]/jeu and the menu FAB. Tolerates missing tables. */
export async function loadGameConfig(slug: string): Promise<GameConfig> {
  const off: GameConfig = { active: false, loyaltyActive: false, businessName: '', prizes: [], welcomePoints: 0, accent: FALLBACK_ACCENT, gradient: 'linear-gradient(135deg, #F47B20, #F5B82E)', gates: [], qrGate: { enabled: false } }
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
    let prizeIsLose: boolean[] = []
    let slotEnabled = false
    let slotPointCost = 10
    let rouletteEnabled = true
    let rouletteSchedule: any = null
    let gates: GameGate[] = []
    let qrGate: QrGateSummary = { enabled: false }
    if (game) {
      const { data: rows } = await supabase
        .from('prizes')
        .select('label, config')
        .eq('game_id', game.id)
        .eq('active', true)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
      prizes = (rows || []).map((p: any) => p.label)
      prizeIsLose = (rows || []).map((p: any) => Boolean(p.config?.isLose))
      const gConf = (game as any).config || {}
      slotEnabled = Boolean(gConf.slotEnabled)
      slotPointCost = Number(gConf.slotPointCost) || 10
      rouletteEnabled = gConf.rouletteEnabled !== false
      rouletteSchedule = gConf.rouletteSchedule || null

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

      // Sanitized QR-gate summary — only the enabled flag reaches the client.
      const q = (game as any).config?.qrGate
      if (q && typeof q === 'object') {
        qrGate = { enabled: Boolean(q.enabled) && typeof q.qrKey === 'string' && q.qrKey.length > 0 }
      }
    }

    const { data: program } = await supabase
      .from('loyalty_programs')
      .select('business_id, welcome_points')
      .eq('business_id', business.id)
      .eq('active', true)
      .maybeSingle()

    // Master switch: if the owner hasn't enabled the fidelity system, the whole
    // game/loyalty layer reads as off (so the roulette button + store never show).
    const fidelity = isFidelityLive(business)
    const loyaltyOn = fidelity && Boolean(program)
    return {
      active: fidelity && Boolean(game) && prizes.length > 0,
      loyaltyActive: loyaltyOn,
      businessName: business.name,
      prizes,
      prizeIsLose,
      slotEnabled,
      slotPointCost,
      rouletteEnabled,
      rouletteSchedule,
      welcomePoints: loyaltyOn ? Number(program.welcome_points) || 0 : 0,
      accent,
      gradient,
      gates,
      qrGate,
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

/**
 * Defence-in-depth play-limit check in Node. The authoritative, race-safe check
 * is inside the play_game RPC (serialized by a row lock); this ALSO enforces the
 * limit when the deployed RPC is out of date (the common cause of "I can still
 * spin a lot") and tells the client exactly when the next play unlocks.
 *
 * Model: a ROLLING cooldown window (config.cooldownHours, default 24) — a phone
 * or device may play `daily_limit` times within any window of that length, and
 * the window slides from each play. So it's a true "once per 24h / week", not a
 * calendar-day reset. Returns { reason, nextPlayAt } when blocked, else null.
 * Fails OPEN on a transient error so a legit spin is never wrongly blocked.
 */
export async function playLimitBlocked(
  slug: string,
  deviceId: string | null,
  phone: string | null
): Promise<{ reason: 'phone_limit' | 'device_limit'; nextPlayAt: string | null } | null> {
  try {
    const supabase: any = await createServiceRoleClient()
    const { data: business } = await supabase
      .from('businesses').select('id').eq('slug', slug).eq('status', 'active').maybeSingle()
    if (!business) return null
    const { data: game } = await supabase
      .from('games').select('id, daily_limit, config')
      .eq('business_id', business.id).eq('type', 'roulette').eq('active', true).maybeSingle()
    if (!game) return null
    const limit = Math.max(1, Number(game.daily_limit) || 1)
    const cooldownMs = gameCooldownHours(game.config) * 3600_000
    const sinceMs = Date.now() - cooldownMs
    const since = new Date(sinceMs).toISOString()

    // null → within the limit; otherwise the ISO time the next play unlocks.
    const nextUnlock = async (column: 'customer_phone' | 'device_id', value: string): Promise<string | null> => {
      const { data: rows } = await supabase
        .from('plays').select('created_at')
        .eq('game_id', game.id).eq(column, value).gte('created_at', since)
        .order('created_at', { ascending: true })
      const count = rows?.length || 0
      if (count < limit) return null
      // The play at index (count - limit) is the one whose expiry from the window
      // drops the running count below the limit → that's when the next play opens.
      const pivot = rows[count - limit]?.created_at
      const base = pivot ? new Date(pivot).getTime() : sinceMs
      return new Date(base + cooldownMs).toISOString()
    }

    if (phone) {
      const next = await nextUnlock('customer_phone', phone)
      if (next !== null) return { reason: 'phone_limit', nextPlayAt: next }
    }
    if (deviceId) {
      const next = await nextUnlock('device_id', deviceId)
      if (next !== null) return { reason: 'device_limit', nextPlayAt: next }
    }
    return null
  } catch (e: any) {
    console.error('playLimitBlocked:', e?.message)
    return null
  }
}

/** Coerce a stored games.config.qrGate blob into a safe, complete QrGateConfig. */
export function normalizeQrGate(raw: any): QrGateConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_QR_GATE
  const ttl = Number(raw.ttlMin)
  return {
    enabled: Boolean(raw.enabled),
    ttlMin: Number.isFinite(ttl) && ttl > 0 ? Math.min(1440, Math.round(ttl)) : DEFAULT_QR_GATE.ttlMin,
    qrKey: typeof raw.qrKey === 'string' ? raw.qrKey : '',
    message: typeof raw.message === 'string' ? raw.message : '',
    alsoRedeem: Boolean(raw.alsoRedeem),
  }
}

/**
 * FULL QR-gate config + the business id for an active roulette — SERVER-ONLY,
 * used to enforce the scan cookie. Never send qrKey to the client; the public
 * summary lives in loadGameConfig().qrGate.
 */
export async function loadQrGate(slug: string): Promise<{ businessId: string; gate: QrGateConfig } | null> {
  try {
    const supabase: any = await createServiceRoleClient()
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle()
    if (!business) return null
    const { data: game } = await supabase
      .from('games')
      .select('config')
      .eq('business_id', business.id)
      .eq('type', 'roulette')
      .eq('active', true)
      .maybeSingle()
    return { businessId: business.id, gate: normalizeQrGate((game as any)?.config?.qrGate) }
  } catch (e: any) {
    console.error('loadQrGate:', e?.message)
    return null
  }
}
