import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getActiveBusiness } from '@/lib/db/business'
import { validateCode, awardPoints, customerSummary, normPhone, pendingRedemptions, declineRedemption } from '@/lib/db/loyalty'
import { businessHasStaffPins, verifyStaffPin } from '@/lib/db/staff-pins'
import { checkRateLimit } from '@/lib/api/rate-limit'

/** Per-transaction cap on a caisse credit — a typo can't mint a fortune. */
const MAX_AWARD_TND = 5000

/**
 * Owner "caisse" console — one endpoint, three actions:
 *   { action: 'check', code }              → PEEK a code (no redeem) — show it first
 *   { action: 'validate', code }          → redeem/collect (= APPROVE) a win OR reward code
 *   { action: 'award', phone, amount, note? } → credit a purchase (+ welcome)
 *   { action: 'lookup', phone }            → balance + history + active codes
 *   { action: 'pending' }                  → list still-pending reward requests
 *   { action: 'decline', code }            → reject a pending request + refund points
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
      const result = await awardPoints(business.id, phone, amount, note)
      if (!result.ok) {
        const msg = result.error === 'no_program' ? 'Activez d’abord le programme de fidélité.' : 'Crédit momentanément indisponible.'
        return NextResponse.json({ error: msg }, { status: result.error === 'no_program' ? 409 : 500 })
      }
      return NextResponse.json(result)
    }

    if (action === 'lookup') {
      const phone = normPhone(body.phone)
      if (!phone) return NextResponse.json({ error: 'Numéro invalide.' }, { status: 400 })
      const summary = await customerSummary(business.id, phone)
      return NextResponse.json({ phone, ...summary })
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
