import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getActiveBusiness } from '@/lib/db/business'
import { requireCap } from '@/lib/access/withStaff'
import { logStaffAction } from '@/lib/db/staff'
import { validateCode, awardPoints, customerSummary, normPhone, pendingRedemptions, declineRedemption, listActiveRewards, redeemAtCounter } from '@/lib/db/loyalty'
import { checkRateLimit } from '@/lib/api/rate-limit'

/** Per-transaction cap on a caisse credit — a typo can't mint a fortune. */
const MAX_AWARD_TND = 5000

/**
 * Best-effort, in-process replay guard for the non-idempotent 'award' action.
 * A retried/double-submitted POST (same café + phone + amount) would otherwise
 * credit the points twice. We remember the result of an award keyed by its
 * meaningful fields for a short window and, on a duplicate within that window,
 * replay the SAME success response without re-crediting. Same constraints as
 * lib/api/rate-limit.ts: per-PROCESS, ephemeral (resets on cold start, not
 * shared across instances) — it collapses rapid retries, it is not a hard
 * cross-instance guarantee. The complete fix (client idempotency-key + DB
 * unique constraint) is deferred. checkRateLimit can't enforce 1/min (its
 * window is fixed at 60/min), so we use a tiny dedicated map here.
 */
const AWARD_DEDUP_MS = 60_000
const awardDedup = new Map<string, { at: number; result: any }>()
function takeRecentAward(key: string): any | null {
  const now = Date.now()
  // Opportunistic prune so the map can't grow unbounded. (forEach, not for-of:
  // the es5 target can't iterate a Map directly — TS2802.)
  awardDedup.forEach((v, k) => { if (now - v.at >= AWARD_DEDUP_MS) awardDedup.delete(k) })
  const hit = awardDedup.get(key)
  return hit && now - hit.at < AWARD_DEDUP_MS ? hit.result : null
}

/**
 * Owner "caisse" console — one endpoint, three actions:
 *   { action: 'check', code }              → PEEK a code (no redeem) — show it first
 *   { action: 'validate', code }          → redeem/collect (= APPROVE) a win OR reward code
 *   { action: 'award', phone, amount, note? } → credit a purchase (+ welcome)
 *   { action: 'lookup', phone }            → balance + history + active codes
 *   { action: 'pending' }                  → list still-pending reward requests
 *   { action: 'decline', code }            → reject a pending request + refund points
 *   { action: 'rewards' }                  → active rewards (for the counter picker)
 *   { action: 'counterRedeem', phone, reward_id } → redeem a reward at the counter
 *
 * requireOwner gates the session; the unified staff model (getActiveStaff via
 * requireCap) decides WHO may do WHAT — the lock screen already collected the
 * staff PIN once at login, so privileged actions check capabilities, not a
 * re-typed PIN. PIN off / no staff / owner → owner-level (no behaviour change).
 */
export async function POST(request: Request) {
  try {
    await requireOwner()
    const business = await getActiveBusiness()
    if (!business) {
      return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    }
    // Base gate: must have caisse-page access (owner-level when PINs are off).
    const gate = await requireCap('page.caisse')
    if ('res' in gate) return gate.res
    const staff = gate.staff

    const body = await request.json().catch(() => ({}))
    const action = body.action

    if (action === 'check' || action === 'validate') {
      const cap = await requireCap('caisse.validate_code')
      if ('res' in cap) return cap.res
      // Per-business, per-action rate limit (60/min, 5000/day): ample for human
      // counter use across all registers; throttles scripted code enumeration.
      const rl = checkRateLimit(`caisse:${action}:${business.id}`)
      if (!rl.ok) {
        return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans un instant.' },
          { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
      }
      const code = typeof body.code === 'string' ? body.code.trim() : ''
      if (code.length < 4) return NextResponse.json({ error: 'Code invalide.' }, { status: 400 })
      // 'check' peeks (no redeem); 'validate' collects (marks redeemed).
      const result = await validateCode(business.id, code, action === 'validate')
      if (action === 'validate' && (result as any)?.ok !== false) {
        await logStaffAction({ businessId: business.id, actorStaff: staff.staffId, actorLabel: staff.label, action: 'caisse_validate', detail: `code ${code}` })
      }
      return NextResponse.json(result)
    }

    if (action === 'award') {
      const cap = await requireCap('caisse.award')
      if ('res' in cap) return cap.res
      const phone = normPhone(body.phone)
      const amount = Number(body.amount)
      if (!phone) return NextResponse.json({ error: 'Numéro invalide.' }, { status: 400 })
      if (!amount || amount <= 0) return NextResponse.json({ error: 'Montant invalide.' }, { status: 400 })
      if (amount > MAX_AWARD_TND) {
        return NextResponse.json({ error: `Montant trop élevé (max ${MAX_AWARD_TND} TND). Vérifiez le montant saisi.` }, { status: 400 })
      }
      const note = typeof body.note === 'string' ? body.note.slice(0, 120) : `Achat de ${amount} TND`
      // Replay guard: a network retry of the SAME submit (same per-click
      // idemKey) replays the original success instead of crediting twice. A
      // deliberate repeat purchase carries a FRESH idemKey, so an identical
      // café+phone+amount within the window is still credited (the bug this
      // fixes). If a legacy/missing key, fall back to the meaningful fields so
      // the guard still collapses true retries.
      const idemKey = typeof body.idemKey === 'string' && body.idemKey ? body.idemKey : `${phone}:${amount}`
      const dedupKey = `award:${business.id}:${phone}:${amount}:${idemKey}`
      const replayed = takeRecentAward(dedupKey)
      if (replayed) return NextResponse.json(replayed)
      const result = await awardPoints(business.id, phone, amount, note)
      if (!result.ok) {
        const msg = result.error === 'no_program' ? 'Activez d’abord le programme de fidélité.' : 'Crédit momentanément indisponible.'
        return NextResponse.json({ error: msg }, { status: result.error === 'no_program' ? 409 : 500 })
      }
      awardDedup.set(dedupKey, { at: Date.now(), result })
      await logStaffAction({ businessId: business.id, actorStaff: staff.staffId, actorLabel: staff.label, action: 'caisse_award', amount, detail: `${phone} +${amount} TND` })
      return NextResponse.json(result)
    }

    if (action === 'lookup') {
      const phone = normPhone(body.phone)
      if (!phone) return NextResponse.json({ error: 'Numéro invalide.' }, { status: 400 })
      const summary = await customerSummary(business.id, phone)
      return NextResponse.json({ phone, ...summary })
    }

    if (action === 'rewards') {
      // The active rewards for the counter "échanger" picker. (The per-action PIN
      // field is gone — the lock screen handles staff identity now.)
      const rewards = await listActiveRewards(business.id)
      return NextResponse.json({ rewards, pinRequired: false })
    }

    if (action === 'counterRedeem') {
      const cap = await requireCap('caisse.redeem')
      if ('res' in cap) return cap.res
      const phone = normPhone(body.phone)
      const rewardId = typeof body.reward_id === 'string' ? body.reward_id : ''
      if (!phone) return NextResponse.json({ error: 'Numéro invalide.' }, { status: 400 })
      if (!rewardId) return NextResponse.json({ error: 'Récompense invalide.' }, { status: 400 })
      const result = await redeemAtCounter(business.id, phone, rewardId)
      if (!result.ok) {
        if (result.error === 'insufficient') {
          return NextResponse.json({ error: `Points insuffisants — il manque ${result.missing}.`, missing: result.missing }, { status: 400 })
        }
        const msg = result.error === 'no_program' ? 'Activez d’abord le programme de fidélité.'
          : result.error === 'no_reward' ? 'Récompense introuvable ou inactive.'
            : 'Échange momentanément indisponible.'
        return NextResponse.json({ error: msg }, { status: result.error === 'no_program' ? 409 : 500 })
      }
      await logStaffAction({ businessId: business.id, actorStaff: staff.staffId, actorLabel: staff.label, action: 'caisse_redeem', detail: `${phone} · ${rewardId}` })
      return NextResponse.json(result)
    }

    if (action === 'pending') {
      const list = await pendingRedemptions(business.id)
      return NextResponse.json({ pending: list })
    }

    if (action === 'decline') {
      const cap = await requireCap('caisse.decline')
      if ('res' in cap) return cap.res
      const rl = checkRateLimit(`caisse:decline:${business.id}`)
      if (!rl.ok) {
        return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans un instant.' },
          { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
      }
      const code = typeof body.code === 'string' ? body.code.trim() : ''
      if (code.length < 4) return NextResponse.json({ error: 'Code invalide.' }, { status: 400 })
      const result = await declineRedemption(business.id, code)
      if (!result.ok) {
        const msg = result.error === 'not_pending' ? 'Cette demande a déjà été traitée.'
          : result.error === 'not_found' ? 'Demande introuvable.'
            : 'Action momentanément indisponible.'
        return NextResponse.json({ error: msg }, { status: 409 })
      }
      await logStaffAction({ businessId: business.id, actorStaff: staff.staffId, actorLabel: staff.label, action: 'caisse_decline', detail: `code ${code}` })
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_REDIRECT')) throw error
    console.error('caisse route:', error?.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
