import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getActiveBusiness } from '@/lib/db/business'
import { listOrders, updateOrderStatus } from '@/lib/db/ordering'
import { ORDER_STATUSES, type OrderStatus } from '@/lib/orders'

export const dynamic = 'force-dynamic'

/**
 * Owner "Commandes" console.
 *   GET                          → all orders for the owner's café (newest first).
 *   POST {orderId, status}       → move an order to a new status.
 * requireOwner gates it; the owner's own business id is the only one ever used.
 */
export async function GET() {
  try {
    await requireOwner()
    const business = await getActiveBusiness()
    if (!business) return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    const orders = await listOrders(business.id)
    return NextResponse.json({ orders })
  } catch (e: any) {
    if (e?.digest?.startsWith?.('NEXT_REDIRECT') || e?.message === 'NEXT_REDIRECT') throw e
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }
}

export async function POST(request: Request) {
  try {
    await requireOwner()
    const business = await getActiveBusiness()
    if (!business) return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    const body = await request.json().catch(() => ({}))
    const orderId = typeof body?.orderId === 'string' ? body.orderId : ''
    const status = body?.status as OrderStatus
    if (!orderId || !ORDER_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
    }
    const ok = await updateOrderStatus(business.id, orderId, status)
    if (!ok) return NextResponse.json({ error: 'Échec de la mise à jour.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e?.digest?.startsWith?.('NEXT_REDIRECT') || e?.message === 'NEXT_REDIRECT') throw e
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }
}
