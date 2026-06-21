import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getActiveBusiness } from '@/lib/db/business'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { normPhone } from '@/lib/db/loyalty'
import { generateWinCode } from '@/lib/game'

/**
 * Owner-operated "admin roulette" — a one-user wheel the owner spins at the
 * counter for a walk-in. Separate from the customer game (games/prizes/wins):
 * its own prizes (admin_roulette_prizes) and its own wins (admin_roulette_wins),
 * a prize tied to a phone, claimable later.
 *
 *   { action: 'load' }                                   → prizes + counters
 *   { action: 'addPrize' }                               → append a lot
 *   { action: 'updatePrize', prizeId, patch }            → edit label/%/active
 *   { action: 'deletePrize', prizeId }                   → remove a lot
 *   { action: 'spin' }                                   → server weighted draw
 *   { action: 'saveWin', prizeId?, prizeLabel, phone, name? } → record the win
 *   { action: 'lookup', phone }                          → that phone's prizes
 *   { action: 'setWinStatus', winId, status }            → claim / cancel / reopen
 *
 * requireOwner gates it; the owner's own business id is the only one ever used,
 * so an owner can never touch another business.
 */

const PRIZE_FIELDS = ['label', 'weight', 'active', 'position'] as const

// First-run prize set — percentages that already sum to 100, so the wheel works
// out of the box and the owner only tweaks from there.
const DEFAULT_ADMIN_PRIZES: { label: string; weight: number }[] = [
  { label: 'Café offert', weight: 15 },
  { label: 'Dessert offert', weight: 10 },
  { label: '-10% sur l’addition', weight: 25 },
  { label: '-5% sur l’addition', weight: 30 },
  { label: 'Boisson offerte', weight: 20 },
]

function pick(obj: any, fields: readonly string[]) {
  const out: Record<string, any> = {}
  if (obj && typeof obj === 'object') for (const f of fields) if (f in obj) out[f] = obj[f]
  return out
}

/**
 * Best-effort, in-process replay guard for the non-idempotent 'saveWin' action.
 * A retried/double-submitted POST (same café + phone + prize) would otherwise
 * mint a second prize code for the same walk-in. We remember the recorded win
 * keyed by its meaningful fields for a short window and, on a duplicate within
 * that window, replay the SAME win instead of inserting another row. Same
 * constraints as lib/api/rate-limit.ts: per-PROCESS, ephemeral (resets on cold
 * start, not shared across instances) — collapses rapid retries, not a hard
 * cross-instance guarantee. The complete fix (client idempotency-key + DB
 * unique constraint) is deferred.
 */
const SAVEWIN_DEDUP_MS = 60_000
const saveWinDedup = new Map<string, { at: number; win: any }>()
function takeRecentWin(key: string): any | null {
  const now = Date.now()
  // forEach, not for-of: the es5 target can't iterate a Map directly (TS2802).
  saveWinDedup.forEach((v, k) => { if (now - v.at >= SAVEWIN_DEDUP_MS) saveWinDedup.delete(k) })
  const hit = saveWinDedup.get(key)
  return hit && now - hit.at < SAVEWIN_DEDUP_MS ? hit.win : null
}

/** Weighted draw → 0-based index. Falls back to uniform if all weights are 0. */
function weightedIndex(weights: number[]): number {
  const total = weights.reduce((a, w) => a + Math.max(0, w), 0)
  if (total <= 0) return Math.floor(Math.random() * Math.max(1, weights.length))
  let r = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i])
    if (r < 0) return i
  }
  return weights.length - 1
}

export async function POST(request: Request) {
  try {
    const { user } = await requireOwner()
    const business = await getActiveBusiness()
    if (!business) {
      return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    }
    const supabase: any = await createServiceRoleClient()
    const body = await request.json().catch(() => ({}))
    const action = body.action

    // A prize id is only touched if it belongs to this business.
    const ownPrize = async (prizeId: string) => {
      if (!prizeId) return null
      const { data } = await supabase
        .from('admin_roulette_prizes')
        .select('id, business_id')
        .eq('id', prizeId)
        .maybeSingle()
      return data && data.business_id === business.id ? data : null
    }

    const fetchPrizes = async () =>
      (
        await supabase
          .from('admin_roulette_prizes')
          .select('*')
          .eq('business_id', business.id)
          .order('position', { ascending: true })
          .order('created_at', { ascending: true })
      ).data || []

    if (action === 'load') {
      let prizes = await fetchPrizes()
      // First visit → seed a sensible default wheel so it works immediately.
      if (prizes.length === 0) {
        const rows = DEFAULT_ADMIN_PRIZES.map((p, i) => ({ business_id: business.id, label: p.label, weight: p.weight, position: i }))
        const { error } = await supabase.from('admin_roulette_prizes').insert(rows)
        if (error) throw error
        prizes = await fetchPrizes()
      }
      const since = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
      const [pending, claimedToday] = await Promise.all([
        supabase.from('admin_roulette_wins').select('id', { count: 'exact', head: true }).eq('business_id', business.id).eq('status', 'pending'),
        supabase.from('admin_roulette_wins').select('id', { count: 'exact', head: true }).eq('business_id', business.id).eq('status', 'claimed').gte('claimed_at', since),
      ])
      return NextResponse.json({ prizes, stats: { pending: pending.count ?? 0, claimedToday: claimedToday.count ?? 0 } })
    }

    if (action === 'addPrize') {
      const { count } = await supabase
        .from('admin_roulette_prizes')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
      const { data, error } = await supabase
        .from('admin_roulette_prizes')
        .insert({ business_id: business.id, label: 'Nouveau lot', weight: 1, position: count ?? 0 })
        .select('*')
        .single()
      if (error) throw error
      return NextResponse.json({ ok: true, prize: data })
    }

    if (action === 'updatePrize') {
      if (!(await ownPrize(String(body.prizeId || '')))) return NextResponse.json({ error: 'Lot introuvable.' }, { status: 404 })
      const { error } = await supabase.from('admin_roulette_prizes').update(pick(body.patch, PRIZE_FIELDS)).eq('id', body.prizeId)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (action === 'deletePrize') {
      if (!(await ownPrize(String(body.prizeId || '')))) return NextResponse.json({ error: 'Lot introuvable.' }, { status: 404 })
      const { error } = await supabase.from('admin_roulette_prizes').delete().eq('id', body.prizeId)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (action === 'spin') {
      const { data: active } = await supabase
        .from('admin_roulette_prizes')
        .select('id, label, weight')
        .eq('business_id', business.id)
        .eq('active', true)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
      const list = active || []
      if (list.length === 0) return NextResponse.json({ ok: false, error: 'no_prizes' }, { status: 409 })
      const idx = weightedIndex(list.map((p: any) => Number(p.weight) || 0))
      const prize = list[idx]
      return NextResponse.json({ ok: true, prizeIndex: idx, prizeId: prize.id, prizeLabel: prize.label })
    }

    if (action === 'saveWin') {
      const phone = normPhone(body.phone)
      if (!phone) return NextResponse.json({ error: 'Numéro invalide.' }, { status: 400 })
      const prizeLabel = typeof body.prizeLabel === 'string' ? body.prizeLabel.trim().slice(0, 120) : ''
      if (!prizeLabel) return NextResponse.json({ error: 'Lot manquant.' }, { status: 400 })
      const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 80) : null
      // Only keep a prize_id that genuinely belongs here; otherwise store null.
      const prizeId = body.prizeId && (await ownPrize(String(body.prizeId))) ? body.prizeId : null
      // Replay guard: a retried/double-submitted identical saveWin (same café +
      // phone + prize) replays the original win instead of minting a 2nd code.
      const dedupKey = `savewin:${business.id}:${phone}:${prizeId || prizeLabel}`
      const replayed = takeRecentWin(dedupKey)
      if (replayed) return NextResponse.json({ ok: true, win: replayed })
      const { data, error } = await supabase
        .from('admin_roulette_wins')
        .insert({ business_id: business.id, prize_id: prizeId, prize_label: prizeLabel, customer_phone: phone, customer_name: name, code: generateWinCode(), status: 'pending' })
        .select('*')
        .single()
      if (error) throw error
      saveWinDedup.set(dedupKey, { at: Date.now(), win: data })
      return NextResponse.json({ ok: true, win: data })
    }

    if (action === 'lookup') {
      const phone = normPhone(body.phone)
      if (!phone) return NextResponse.json({ error: 'Numéro invalide.' }, { status: 400 })
      const { data } = await supabase
        .from('admin_roulette_wins')
        .select('*')
        .eq('business_id', business.id)
        .eq('customer_phone', phone)
        .order('created_at', { ascending: false })
        .limit(50)
      return NextResponse.json({ phone, wins: data || [] })
    }

    if (action === 'setWinStatus') {
      const status = body.status
      if (!['pending', 'claimed', 'cancelled'].includes(status)) {
        return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 })
      }
      const { data: win } = await supabase
        .from('admin_roulette_wins')
        .select('id, business_id')
        .eq('id', String(body.winId || ''))
        .maybeSingle()
      if (!win || win.business_id !== business.id) return NextResponse.json({ error: 'Gain introuvable.' }, { status: 404 })
      const { error } = await supabase
        .from('admin_roulette_wins')
        .update({ status, claimed_at: status === 'claimed' ? new Date().toISOString() : null })
        .eq('id', body.winId)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  } catch (e: any) {
    if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e
    console.error('admin/roulette route:', e?.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
