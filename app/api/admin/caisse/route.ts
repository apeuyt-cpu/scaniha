import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getActiveBusiness } from '@/lib/db/business'
import { validateCode, awardPoints, customerSummary, normPhone, pendingRedemptions, declineRedemption, listActiveRewards, redeemAtCounter } from '@/lib/db/loyalty'
import { businessHasStaffPins, verifyStaffPin } from '@/lib/db/staff-pins'
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
 *   { action: 'rewards' }                  → active rewards + whether a staff PIN is required
 *   { action: 'counterRedeem', phone, reward_id, pin? } → redeem a reward at the counter
 *
 * requireOwner gates it; the owner's own business id is the only one ever
 * passed to the RPCs, so an owner can never touch another business.
 */
export async function POST(request: Request) {
  try {
    const { user } = await requireOwner()
    const business = await getActiveBusiness()
    if (!business) {
      return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const action = body.action

    if (action === 'check' || action === 'validate') {
      // Per-business, per-action rate limit (60/min, 5000/day): ample for human
      // counter use across all registers; throttles scripted code enumeration.
      // requireOwner already gates the route → this is defense-in-depth.
      const rl = checkRateLimit(`caisse:${action}:${business.id}`)
      if (!rl.ok) {
        return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans un instant.' },
          { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
      }
      const code = typeof body.code === 'string' ? body.code.trim() : ''
      if (code.length < 4) return NextResponse.json({ error: 'Code invalide.' }, { status: 400 })
      // 'check' peeks (no redeem); 'validate' collects (marks redeemed).
      const result = await validateCode(business.id, code, action === 'validate')
      return NextResponse.json(result)
    }

    if (action === 'award') {
      const phone = normPhone(body.phone)
      const amount = Number(body.amount)
      if (!phone) return NextResponse.json({ error: 'Numéro invalide.' }, { status: 400 })
      if (!amount || amount <= 0) return NextResponse.json({ error: 'Montant invalide.' }, { status: 400 })
      if (amount > MAX_AWARD_TND) {
        return NextResponse.json({ error: `Montant trop élevé (max ${MAX_AWARD_TND} TND). Vérifiez le montant saisi.` }, { status: 400 })
      }
      // Opt-in staff PIN gate (only the 'award' action). Zero active pins →
      // skipped entirely (backward-compatible). PIN is never logged.
      const pin = typeof body.pin === 'string' ? body.pin.trim() : ''
      const pinsRequired = await businessHasStaffPins(business.id)
      if (pinsRequired) {
        if (!pin) return NextResponse.json({ error: 'Code PIN requis.', code: 'PIN_REQUIRED' }, { status: 401 })
        // Review fix #3.3 — throttle PIN guesses per café so a 4-6 digit PIN can't be
        // brute-forced. Separate key from the check/validate limiter (do not share budget).
        const rlPin = checkRateLimit(`caisse:award:pin:${business.id}`)
        if (!rlPin.ok) {
          return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans un instant.' },
            { status: 429, headers: { 'Retry-After': String(rlPin.retryAfter) } })
        }
        const okPin = await verifyStaffPin(business.id, pin)
        if (!okPin) return NextResponse.json({ error: 'Code PIN incorrect.', code: 'PIN_INVALID' }, { status: 401 })
      }
      const note = typeof body.note === 'string' ? body.note.slice(0, 120) : `Achat de ${amount} TND`
      // Replay guard: a retried/double-submitted identical award (same café +
      // phone + amount) replays the original success instead of crediting twice.
      const dedupKey = `award:${business.id}:${phone}:${amount}`
      const replayed = takeRecentAward(dedupKey)
      if (replayed) return NextResponse.json(replayed)
      const result = await awardPoints(business.id, phone, amount, note)
      if (!result.ok) {
        const msg = result.error === 'no_program' ? 'Activez d’abord le programme de fidélité.' : 'Crédit momentanément indisponible.'
        return NextResponse.json({ error: msg }, { status: result.error === 'no_program' ? 409 : 500 })
      }
      awardDedup.set(dedupKey, { at: Date.now(), result })
      return NextResponse.json(result)
    }

    if (action === 'lookup') {
      const phone = normPhone(body.phone)
      if (!phone) return NextResponse.json({ error: 'Numéro invalide.' }, { status: 400 })
      const summary = await customerSummary(business.id, phone)
      return NextResponse.json({ phone, ...summary })
    }

    if (action === 'rewards') {
      // The active rewards (for the counter "échanger" picker) + whether the
      // café gates staff actions behind a PIN (so the UI can show the field).
      const [rewards, pinRequired] = await Promise.all([
        listActiveRewards(business.id),
        businessHasStaffPins(business.id),
      ])
      return NextResponse.json({ rewards, pinRequired })
    }

    if (action === 'counterRedeem') {
      const phone = normPhone(body.phone)
      const rewardId = typeof body.reward_id === 'string' ? body.reward_id : ''
      if (!phone) return NextResponse.json({ error: 'Numéro invalide.' }, { status: 400 })
      if (!rewardId) return NextResponse.json({ error: 'Récompense invalide.' }, { status: 400 })
      // Same opt-in staff-PIN gate as 'award' — redeeming gives value away too.
      const pin = typeof body.pin === 'string' ? body.pin.trim() : ''
      const pinsRequired = await businessHasStaffPins(business.id)
      if (pinsRequired) {
        if (!pin) return NextResponse.json({ error: 'Code PIN requis.', code: 'PIN_REQUIRED' }, { status: 401 })
        const rlPin = checkRateLimit(`caisse:redeem:pin:${business.id}`)
        if (!rlPin.ok) {
          return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans un instant.' },
            { status: 429, headers: { 'Retry-After': String(rlPin.retryAfter) } })
        }
        const okPin = await verifyStaffPin(business.id, pin)
        if (!okPin) return NextResponse.json({ error: 'Code PIN incorrect.', code: 'PIN_INVALID' }, { status: 401 })
      }
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
      return NextResponse.json(result)
    }

    if (action === 'pending') {
      const list = await pendingRedemptions(business.id)
      return NextResponse.json({ pending: list })
    }

    if (action === 'decline') {
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
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_REDIRECT')) throw error
    console.error('caisse route:', error?.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
