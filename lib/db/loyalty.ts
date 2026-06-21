/**
 * Loyalty + caisse data layer. Public reads + the atomic RPCs
 * (redeem_reward, award_points, validate_code, customer_summary). The single
 * `as any` for the service client lives here; routes are the auth boundary.
 */
import { createServiceRoleClient } from '@/lib/supabase/server'
import { businessAccent, businessGradient, FALLBACK_ACCENT, isMissingRpc } from '@/lib/db/game'
import { isFidelityLive } from '@/lib/design-settings'
import type { CustomerSummary, RedeemResult, AwardResult, ValidateResult } from '@/lib/game'

/** Normalize a phone to digits (+ optional leading +); 8–15 chars or null. */
export function normPhone(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const digits = input.replace(/[^\d+]/g, '')
  return digits.length >= 8 && digits.length <= 15 ? digits : null
}

export interface LoyaltyConfig {
  active: boolean
  businessName: string
  accent: string
  gradient: string
  pointsPerTnd: number
  rewards: { id: string; label: string; points_cost: number; image_url?: string | null }[]
  summary: CustomerSummary | null
}

/** Public loyalty data for /[slug]/fidelite. Includes the customer summary when a phone is given. */
export async function loadLoyalty(slug: string, phoneRaw?: string | null): Promise<LoyaltyConfig> {
  const off: LoyaltyConfig = { active: false, businessName: '', accent: FALLBACK_ACCENT, gradient: 'linear-gradient(135deg, #F47B20, #F5B82E)', pointsPerTnd: 1, rewards: [], summary: null }
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
    // Master switch off → loyalty is dormant (no points/store) regardless of program.
    if (!isFidelityLive(business)) return { ...off, businessName: business.name, accent, gradient }

    const { data: program } = await supabase
      .from('loyalty_programs')
      .select('points_per_tnd')
      .eq('business_id', business.id)
      .eq('active', true)
      .maybeSingle()
    if (!program) return { ...off, businessName: business.name, accent, gradient }

    const { data: rewards } = await supabase
      .from('loyalty_rewards')
      .select('id, label, points_cost, image_url')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('points_cost', { ascending: true })

    const phone = normPhone(phoneRaw)
    const summary = phone ? await customerSummary(business.id, phone, supabase) : null

    return {
      active: true,
      businessName: business.name,
      accent,
      gradient,
      pointsPerTnd: Number(program.points_per_tnd) || 1,
      rewards: rewards || [],
      summary,
    }
  } catch (e: any) {
    console.error('loadLoyalty:', e?.message)
    return off
  }
}

/** Redeem a reward atomically (balance check + debit) via the RPC. */
export async function redeemReward(slug: string, phone: string, rewardId: string): Promise<RedeemResult> {
  try {
    const supabase: any = await createServiceRoleClient()
    const { data, error } = await supabase.rpc('redeem_reward', { p_slug: slug, p_phone: phone, p_reward_id: rewardId })
    if (error) {
      if (isMissingRpc(error)) return { ok: false, error: 'setup' }
      console.error('redeem_reward rpc:', error.message)
      return { ok: false, error: 'server' }
    }
    return (data as RedeemResult) ?? { ok: false, error: 'server' }
  } catch (e: any) {
    console.error('redeemReward:', e?.message)
    return { ok: false, error: 'server' }
  }
}

// ─── Owner / caisse ops — business_id is already authorized by the route ──

/** Balance + recent history + still-valid codes (caisse lookup + /fidelite panel). */
export async function customerSummary(businessId: string, phone: string, client?: any): Promise<CustomerSummary> {
  const empty: CustomerSummary = { balance: 0, recent: [], activeWins: [], activeRedemptions: [] }
  try {
    const supabase: any = client || (await createServiceRoleClient())
    const { data, error } = await supabase.rpc('customer_summary', { p_business: businessId, p_phone: phone })
    if (error || !data) return empty
    return data as CustomerSummary
  } catch {
    return empty
  }
}

/** Credit a purchase (+ welcome on first visit) via the RPC. */
export async function awardPoints(businessId: string, phone: string, amount: number, note: string): Promise<AwardResult> {
  try {
    const supabase: any = await createServiceRoleClient()
    const { data, error } = await supabase.rpc('award_points', { p_business: businessId, p_phone: phone, p_amount: amount, p_note: note })
    if (error) {
      if (isMissingRpc(error)) return { ok: false, error: 'setup' }
      console.error('award_points rpc:', error.message)
      return { ok: false, error: 'server' }
    }
    return (data as AwardResult) ?? { ok: false, error: 'server' }
  } catch (e: any) {
    console.error('awardPoints:', e?.message)
    return { ok: false, error: 'server' }
  }
}

/**
 * Validate one code (win OR reward).
 *  - redeem=false → "peek": report status without consuming (status 'valid' when
 *    still claimable), so the caisse can show it before staff confirm.
 *  - redeem=true (default) → atomically mark it redeemed = collected (a code can
 *    never be collected twice). This is the caisse "approve" of a reward request.
 */
export async function validateCode(businessId: string, code: string, redeem = true): Promise<ValidateResult> {
  try {
    const supabase: any = await createServiceRoleClient()
    const { data, error } = await supabase.rpc('validate_code', { p_business: businessId, p_code: code, p_redeem: redeem })
    if (error || !data) return { found: false }
    return data as ValidateResult
  } catch {
    return { found: false }
  }
}

export interface PendingRedemption {
  id: string
  code: string
  reward_label: string
  points_cost: number
  customer_phone: string
  created_at: string
  expires_at: string
}

export type DeclineResult =
  | { ok: true; rewardLabel: string; customerPhone: string; refunded: number; balance: number }
  | { ok: false; error: string; status?: string }

/** Still-pending reward requests for this café — the caisse "à approuver" list. */
export async function pendingRedemptions(businessId: string): Promise<PendingRedemption[]> {
  try {
    const supabase: any = await createServiceRoleClient()
    const { data, error } = await supabase
      .from('loyalty_redemptions')
      .select('id, code, reward_label, points_cost, customer_phone, created_at, expires_at')
      .eq('business_id', businessId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(50)
    if (error || !data) return []
    return data as PendingRedemption[]
  } catch {
    return []
  }
}

/** Decline a pending reward request → cancel it and refund the points (atomic RPC). */
export async function declineRedemption(businessId: string, code: string): Promise<DeclineResult> {
  try {
    const supabase: any = await createServiceRoleClient()
    const { data, error } = await supabase.rpc('decline_redemption', { p_business: businessId, p_code: code })
    if (error) {
      if (isMissingRpc(error)) return { ok: false, error: 'setup' }
      console.error('decline_redemption rpc:', error.message)
      return { ok: false, error: 'server' }
    }
    return (data as DeclineResult) ?? { ok: false, error: 'server' }
  } catch {
    return { ok: false, error: 'server' }
  }
}
