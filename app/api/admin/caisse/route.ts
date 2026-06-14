import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getBusinessByOwner } from '@/lib/db/business'
import { validateCode, awardPoints, customerSummary, normPhone } from '@/lib/db/loyalty'

/**
 * Owner "caisse" console — one endpoint, three actions:
 *   { action: 'check', code }              → PEEK a code (no redeem) — show it first
 *   { action: 'validate', code }          → redeem/collect a win OR reward code
 *   { action: 'award', phone, amount, note? } → credit a purchase (+ welcome)
 *   { action: 'lookup', phone }            → balance + history + active codes
 *
 * requireOwner gates it; the owner's own business id is the only one ever
 * passed to the RPCs, so an owner can never touch another business.
 */
export async function POST(request: Request) {
  try {
    const { user } = await requireOwner()
    const business = await getBusinessByOwner(user.id)
    if (!business || business.owner_id !== user.id) {
      return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const action = body.action

    if (action === 'check' || action === 'validate') {
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

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_REDIRECT')) throw error
    console.error('caisse route:', error?.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
