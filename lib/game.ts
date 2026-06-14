/**
 * Gamification v1 — shared types + pure logic.
 * Model: "everyone wins, variable value" (PlayCafé dossier) — the wheel
 * always lands on a prize; the owner tunes value via weights, not a
 * hidden lose-rate. The draw happens SERVER-SIDE only.
 */

export interface GameRow {
  id: string
  business_id: string
  type: string
  active: boolean
  daily_limit: number
  win_expiry_hours: number
  config: Record<string, any>
}

export interface PrizeRow {
  id: string
  game_id: string
  label: string
  weight: number
  stock: number | null
  cost: number | null
  active: boolean
  position: number
}

export interface WinRow {
  id: string
  business_id: string
  prize_label: string
  code: string
  customer_phone: string | null
  status: 'pending' | 'redeemed' | 'expired'
  expires_at: string
  redeemed_at: string | null
  created_at: string
}

// ─── Loyalty rows ────────────────────────────────────────────────────
export interface LoyaltyProgram {
  business_id: string
  active: boolean
  points_per_tnd: number
  play_points: number
  welcome_points: number
  redeem_expiry_hours: number
}

export interface LoyaltyReward {
  id: string
  business_id: string
  label: string
  points_cost: number
  active: boolean
  position: number
}

export interface LedgerEntry {
  delta: number
  reason: 'purchase' | 'play' | 'welcome' | 'redeem' | 'adjust'
  note: string | null
  created_at: string
}

/** A still-valid code a customer holds (wheel win or reward redemption). */
export interface ActiveCode {
  code: string
  label: string
  expires_at: string
  created_at: string
}

// ─── RPC result shapes (mirror supabase/game.sql functions) ──────────
export type PlayResult =
  | { ok: true; prizeIndex: number; prizeLabel: string; code: string; expiresAt: string; pointsEarned: number; balance: number }
  | { ok: false; error: string; missing?: number }

export type RedeemResult =
  | { ok: true; code: string; rewardLabel: string; expiresAt: string; balance: number }
  | { ok: false; error: string; missing?: number }

export type AwardResult =
  | { ok: true; pointsAdded: number; welcomeAdded: number; balance: number }
  | { ok: false; error: string }

export type ValidateResult =
  | { found: false }
  | {
      found: true
      kind: 'win' | 'reward'
      status: 'redeemed' | 'expired' | 'already' | 'cancelled'
      label: string
      customerPhone: string | null
      redeemedAt?: string
      pointsCost?: number
    }

export interface CustomerSummary {
  balance: number
  recent: LedgerEntry[]
  activeWins: ActiveCode[]
  activeRedemptions: ActiveCode[]
}

/** Weighted random pick among available prizes (weight 0 = never drawn). */
export function weightedPick<T extends { weight: number; stock: number | null }>(prizes: T[]): T | null {
  const pool = prizes.filter((p) => p.weight > 0 && (p.stock === null || p.stock > 0))
  if (pool.length === 0) return null
  const total = pool.reduce((s, p) => s + p.weight, 0)
  let r = Math.random() * total
  for (const p of pool) {
    r -= p.weight
    if (r < 0) return p
  }
  return pool[pool.length - 1]
}

/** Human-friendly redeem code, e.g. "K7F-3QZ" (no 0/O/1/I ambiguity). */
export function generateWinCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return `${out.slice(0, 3)}-${out.slice(3)}`
}

/** Default prize set offered when an owner activates the game. */
export const DEFAULT_PRIZES: { label: string; weight: number; cost: number | null }[] = [
  { label: 'Café offert', weight: 2, cost: 2.5 },
  { label: '-10% sur l’addition', weight: 4, cost: null },
  { label: 'Dessert offert', weight: 2, cost: 5 },
  { label: '-5% sur l’addition', weight: 6, cost: null },
  { label: 'Boisson offerte', weight: 3, cost: 3.5 },
  { label: 'Surprise du chef', weight: 1, cost: null },
]
