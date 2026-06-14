/**
 * Game data layer — the single place where the (still untyped in
 * database.types.ts) game tables + RPCs are touched, so `as any` lives here
 * and nowhere else. All spins go through the atomic `play_game` RPC.
 */
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getDesignSettings, resolveAccent, isDesignId, type DesignId } from '@/lib/design-settings'
import type { PlayResult } from '@/lib/game'

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

export interface GameConfig {
  active: boolean
  loyaltyActive: boolean
  businessName: string
  prizes: string[]
  accent: string
}

/** Public wheel config for /[slug]/jeu and the menu FAB. Tolerates missing tables. */
export async function loadGameConfig(slug: string): Promise<GameConfig> {
  const off: GameConfig = { active: false, loyaltyActive: false, businessName: '', prizes: [], accent: FALLBACK_ACCENT }
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

    const { data: game } = await supabase
      .from('games')
      .select('id')
      .eq('business_id', business.id)
      .eq('type', 'roulette')
      .eq('active', true)
      .maybeSingle()

    let prizes: string[] = []
    if (game) {
      const { data: rows } = await supabase
        .from('prizes')
        .select('label')
        .eq('game_id', game.id)
        .eq('active', true)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
      prizes = (rows || []).map((p: any) => p.label)
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
