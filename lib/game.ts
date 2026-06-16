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

// ─── "Conditions pour jouer" — gates a player must clear before spinning ─────
export type GateType = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'link' | 'survey'

export interface SurveyQuestion {
  id: string
  text: string
}

export interface GameGate {
  id: string
  type: GateType
  label: string
  enabled: boolean
  /** Link-style gates (instagram/facebook/tiktok/youtube/link). */
  url?: string
  /** Survey gate only — inline questions; answers are saved server-side. */
  questions?: SurveyQuestion[]
}

export interface GatesConfig {
  enabled: boolean
  items: GameGate[]
}

// ─── QR-session gate — "must have scanned the café's QR recently" ────────────
// Replaces the old Wi-Fi/IP + GPS presence lock. The café's QR carries a secret
// key (qrKey); scanning it mints a short-lived signed cookie. Spinning requires
// a valid, non-expired cookie, so a diner must (re)scan on-site. The owner can
// rotate qrKey from admin to invalidate every active scan session at once.
export interface QrGateConfig {
  enabled: boolean
  /** Scan-session validity in minutes — how long after a scan a diner can play. */
  ttlMin: number
  /** Secret embedded in the QR URL (?s=…). Empty until the owner enables the gate. */
  qrKey: string
  /** Optional custom message shown to a blocked diner (French). */
  message: string
  /** Also require a fresh scan to redeem loyalty rewards. */
  alsoRedeem: boolean
}

/** Public (sanitized) gate summary sent to the client — NEVER the qrKey. */
export interface QrGateSummary {
  enabled: boolean
}

/** Allowed scan-session durations (minutes) offered in the admin + super-admin. */
export const QR_TTL_OPTIONS = [10, 30, 60, 120, 240, 480] as const

export const DEFAULT_QR_GATE: QrGateConfig = {
  enabled: false,
  ttlMin: 10,
  qrKey: '',
  message: '',
  alsoRedeem: false,
}

// ─── Play cooldown — the rolling window between plays ────────────────────────
// Stored in games.config.cooldownHours (jsonb, so no schema migration). A phone
// or device may play `daily_limit` times within any window of this length, and
// the window SLIDES from each play — a true "once per 24h / week", not a
// calendar-day reset (which let a player spin at 23:59 and again at 00:01).
export const DEFAULT_COOLDOWN_HOURS = 24

/** Read + clamp the cooldown (hours) from a game config. Default 24h. */
export function gameCooldownHours(config: any): number {
  const h = Number(config?.cooldownHours)
  if (!Number.isFinite(h) || h < 1) return DEFAULT_COOLDOWN_HOURS
  return Math.min(8760, Math.round(h)) // cap at a year
}

/** Cooldown presets offered to the owner in the admin. */
export const COOLDOWN_OPTIONS: { hours: number; label: string }[] = [
  { hours: 12, label: 'Toutes les 12 heures' },
  { hours: 24, label: 'Une fois par jour' },
  { hours: 48, label: 'Tous les 2 jours' },
  { hours: 168, label: 'Une fois par semaine' },
  { hours: 720, label: 'Une fois par mois' },
]

/** Catalogue of gate types + whether each opens a link or shows the inline survey. */
export const GATE_TYPES: { type: GateType; label: string; isLink: boolean; emoji: string }[] = [
  { type: 'instagram', label: 'Instagram', isLink: true, emoji: '📸' },
  { type: 'facebook', label: 'Facebook', isLink: true, emoji: '👍' },
  { type: 'tiktok', label: 'TikTok', isLink: true, emoji: '🎵' },
  { type: 'youtube', label: 'YouTube', isLink: true, emoji: '▶️' },
  { type: 'link', label: 'Lien', isLink: true, emoji: '🔗' },
  { type: 'survey', label: 'Sondage', isLink: false, emoji: '📝' },
]

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
  | { ok: true; prizeIndex: number; prizeLabel: string; code: string; expiresAt: string; pointsEarned: number; balance: number; nextPlayAt?: string | null }
  | { ok: false; error: string; missing?: number; nextPlayAt?: string | null }

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
      // 'valid' = peek result: claimable but NOT yet collected (p_redeem=false).
      status: 'valid' | 'redeemed' | 'expired' | 'already' | 'cancelled'
      label: string
      customerPhone: string | null
      redeemedAt?: string
      expiresAt?: string
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

/**
 * Split `total` across `parts` proportionally, as whole numbers that sum
 * EXACTLY to `total`, each at least `min` (largest-remainder method). Used to
 * turn lot weights into clean percentages that always add up to 100 — shared by
 * the customer odds editor (GameManager) and the admin roulette settings.
 */
export function splitInt(parts: number[], total: number, min = 1): number[] {
  const n = parts.length
  if (n === 0) return []
  if (total <= 0) return parts.map(() => 0)
  const effMin = Math.min(min, Math.floor(total / n)) // stay feasible when total < n
  const sum = parts.reduce((a, b) => a + Math.max(0, b), 0)
  const raw = parts.map((w) => (sum > 0 ? (Math.max(0, w) / sum) * total : total / n))
  const ints = raw.map((r) => Math.max(effMin, Math.floor(r)))
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac)
  let used = ints.reduce((a, b) => a + b, 0)
  let k = 0
  while (used < total) { ints[order[k % n].i]++; used++; k++ }
  let guard = 0
  while (used > total && guard < 100000) {
    let idx = -1
    for (let j = n - 1; j >= 0; j--) { const ri = order[j].i; if (ints[ri] > effMin) { idx = ri; break } }
    if (idx < 0) break
    ints[idx]--; used--; guard++
  }
  return ints
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
