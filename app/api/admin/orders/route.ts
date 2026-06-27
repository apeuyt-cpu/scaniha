import { NextResponse } from 'next/server'
import { withStaff } from '@/lib/access/withStaff'
import { listOrders, updateOrderStatus, listServiceCalls, resolveServiceCall } from '@/lib/db/ordering'
import { ORDER_STATUSES, type OrderStatus } from '@/lib/orders'

export const dynamic = 'force-dynamic'

/**
 * Owner/staff "Commandes" console. Guarded by withStaff:
 *   GET                          → page.commandes : all orders + waiter calls.
 *   POST {orderId, status}|{callId} → orders.manage : advance an order / resolve a call.
 */
export const GET = withStaff('page.commandes', async (_req, { business }) => {
  const [orders, calls] = await Promise.all([listOrders(business.id), listServiceCalls(business.id)])
  return NextResponse.json({ orders, calls })
})

export const POST = withStaff('orders.manage', async (request, { business }) => {
  const body = await request.json().catch(() => ({}))

  // Resolve a waiter call (appel serveur) — { callId }.
  if (typeof body?.callId === 'string' && body.callId) {
    const done = await resolveServiceCall(business.id, body.callId)
    if (!done) return NextResponse.json({ error: 'Échec de la mise à jour.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const orderId = typeof body?.orderId === 'string' ? body.orderId : ''
  const status = body?.status as OrderStatus
  if (!orderId || !ORDER_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }
  const ok = await updateOrderStatus(business.id, orderId, status)
  if (!ok) return NextResponse.json({ error: 'Échec de la mise à jour.' }, { status: 500 })
  return NextResponse.json({ ok: true })
})
