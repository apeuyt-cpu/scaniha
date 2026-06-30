import { NextResponse } from 'next/server'
import { withStaff } from '@/lib/access/withStaff'
import {
  ensurePrimaryBranch, listProducts, listOpenSales, openSale, addLine, setLine, applyDiscount, pay, getSale, checkout,
} from '@/lib/db/pos'
import { logStaffAction } from '@/lib/db/staff'
import { isFidelityLive } from '@/lib/design-settings'
import type { PaymentInput } from '@/lib/pos/types'

export const dynamic = 'force-dynamic'

/**
 * POS terminal API. Guarded by withStaff: GET needs page.pos, POST needs
 * pos.sell — so a staff member without the POS capability gets 403 (when PINs are
 * on; owner/PIN-off = full access). Each completed sale is stamped with the
 * cashier (staff.staffId → opened_by/created_by) and logged to the audit.
 * Money is always recomputed server-side; the client total is never trusted.
 */
export const GET = withStaff('page.pos', async (_req, { business }) => {
  const branchId = await ensurePrimaryBranch(business.id, business.name)
  const [products, openSales] = await Promise.all([
    listProducts(business.id),
    listOpenSales(business.id, branchId),
  ])
  return NextResponse.json({ branchId, products, openSales, loyalty: isFidelityLive(business) })
})

export const POST = withStaff('pos.sell', async (request, { business, staff }) => {
  const bid = business.id
  const actor = staff.staffId
  const body = await request.json().catch(() => ({}))
  const action = String(body?.action || '')

  if (action === 'checkout') {
    const lines = Array.isArray(body?.lines) ? body.lines : []
    const payments: PaymentInput[] = Array.isArray(body?.payments) ? body.payments : []
    const idem = typeof body?.idemKey === 'string' && body.idemKey ? body.idemKey : ''
    const phone = typeof body?.phone === 'string' ? body.phone : null
    const dk = body?.discountKind === 'pct' || body?.discountKind === 'amount' ? body.discountKind : null
    const dv = Number(body?.discountValue || 0)
    if (!idem) return NextResponse.json({ error: 'Clé manquante.' }, { status: 400 })
    if (!lines.length) return NextResponse.json({ error: 'Panier vide.' }, { status: 400 })
    const branchId = await ensurePrimaryBranch(bid, business.name)
    const r = await checkout(bid, branchId, lines, { kind: dk, value: dv }, payments, idem, actor, phone)
    if (!r.ok) {
      const status = r.error === 'insufficient' ? 409 : 400
      return NextResponse.json({ error: r.error || 'Échec.', total: r.total }, { status })
    }
    if (r.saleId) {
      await logStaffAction({ businessId: bid, branchId, actorStaff: actor, actorLabel: staff.label, action: 'pos_sale', targetTable: 'pos_sales', targetId: r.saleId, amount: r.total ?? null })
    }
    const pts = r.loyalty && r.loyalty.ok ? (r.loyalty.pointsAdded || 0) : 0
    return NextResponse.json({ ok: true, total: r.total, change: r.change, pointsAdded: pts })
  }

  if (action === 'openSale') {
    const branchId = await ensurePrimaryBranch(bid, business.name)
    const r = await openSale(bid, branchId, { tableLabel: body?.tableLabel ?? null, server: staff.label, openedBy: actor })
    if (!r.ok || !r.saleId) return NextResponse.json({ error: 'Échec ouverture.' }, { status: 500 })
    return NextResponse.json({ ok: true, sale: await getSale(bid, r.saleId) })
  }

  const saleId = typeof body?.saleId === 'string' ? body.saleId : ''
  if (!saleId) return NextResponse.json({ error: 'Vente manquante.' }, { status: 400 })

  if (action === 'addLine') {
    const r = await addLine(bid, saleId, String(body?.productId || ''), Number(body?.qty || 1), Array.isArray(body?.modifiers) ? body.modifiers : [])
    if (!r.ok) return NextResponse.json({ error: r.error || 'Échec ajout.' }, { status: 400 })
    return NextResponse.json({ ok: true, sale: await getSale(bid, saleId) })
  }
  if (action === 'setLine') {
    const r = await setLine(bid, saleId, String(body?.lineId || ''), Number(body?.qty))
    if (!r.ok) return NextResponse.json({ error: r.error || 'Échec.' }, { status: 400 })
    return NextResponse.json({ ok: true, sale: await getSale(bid, saleId) })
  }
  if (action === 'discount') {
    const kind = body?.kind === 'pct' || body?.kind === 'amount' ? body.kind : null
    const r = await applyDiscount(bid, saleId, kind, Number(body?.value || 0))
    if (!r.ok) return NextResponse.json({ error: r.error || 'Échec.' }, { status: 400 })
    return NextResponse.json({ ok: true, sale: await getSale(bid, saleId) })
  }
  if (action === 'getSale') {
    return NextResponse.json({ ok: true, sale: await getSale(bid, saleId) })
  }
  if (action === 'pay') {
    const payments: PaymentInput[] = Array.isArray(body?.payments) ? body.payments : []
    const idem = typeof body?.idemKey === 'string' && body.idemKey ? body.idemKey : ''
    const phone = typeof body?.phone === 'string' ? body.phone : null
    if (!idem) return NextResponse.json({ error: 'Clé manquante.' }, { status: 400 })
    const r = await pay(bid, saleId, payments, idem, actor, phone)
    if (!r.ok) {
      const status = r.error === 'insufficient' ? 409 : 400
      return NextResponse.json({ error: r.error || 'Échec paiement.', total: r.total }, { status })
    }
    await logStaffAction({ businessId: bid, actorStaff: actor, actorLabel: staff.label, action: 'pos_sale', targetTable: 'pos_sales', targetId: saleId, amount: r.total ?? null })
    const pts = r.loyalty && r.loyalty.ok ? (r.loyalty.pointsAdded || 0) : 0
    return NextResponse.json({ ok: true, total: r.total, change: r.change, pointsAdded: pts })
  }

  return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
})
