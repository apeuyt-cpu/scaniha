import { NextRequest, NextResponse } from 'next/server'
import { loadOrderingGate, placeOrder, getOrderStatus } from '@/lib/db/ordering'
import { orderScanCookieName, verifyScan } from '@/lib/qr-session'
import { sanitizeCart } from '@/lib/orders'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { clientIp } from '@/lib/api/client-ip'

export const runtime = 'nodejs'

/**
 * Public table-ordering endpoint (by café slug).
 *   POST {table, items:[{itemId,qty}], name?, note?} → place an order.
 *   GET  ?id=<orderId>                                → that order's live status.
 *
 * SECURITY: placing requires a valid scan-presence cookie (the diner must have
 * scanned the café/table QR recently) — only people physically at the venue can
 * order. Prices are recomputed server-side in place_order; the client price is
 * never trusted. No payment (pay at the table).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const gate = await loadOrderingGate(slug)
  if (!gate || !gate.enabled || !gate.qrKey) {
    return NextResponse.json({ ok: false, error: 'La commande en ligne n’est pas activée.' }, { status: 404 })
  }

  // Presence gate — must have scanned this café's QR recently.
  const cookie = req.cookies.get(orderScanCookieName(gate.businessId))?.value
  if (!verifyScan(cookie, gate.businessId, gate.qrKey, gate.ttlMin)) {
    return NextResponse.json({ ok: false, rescanRequired: true, error: 'Scannez le QR de votre table pour commander.' }, { status: 403 })
  }

  // Per-IP throttle on a public write (spoof-resistant IP).
  const ip = clientIp(req)
  const rl = checkRateLimit('order:' + ip + ':' + slug)
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'Trop de commandes. Réessayez dans un instant.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  }

  const body = await req.json().catch(() => ({}))
  const table = typeof body?.table === 'string' ? body.table.trim().slice(0, 40) : ''
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 60) : null
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 300) : null
  // Client idempotency key (per cart) → safe retries, no duplicate orders.
  const idem = typeof body?.idem === 'string' ? body.idem.trim().slice(0, 64) || null : null
  const items = sanitizeCart(body?.items)
  if (!table || items.length === 0) {
    return NextResponse.json({ ok: false, error: 'Indiquez votre table et au moins un article.' }, { status: 400 })
  }

  const res = await placeOrder(gate.businessId, table, name, note, items, idem)
  if (!res.ok) {
    const map: Record<string, { s: number; m: string }> = {
      no_table: { s: 400, m: 'Numéro de table manquant.' },
      empty: { s: 400, m: 'Votre panier est vide.' },
      no_valid_items: { s: 409, m: 'Ces articles ne sont plus disponibles.' },
    }
    const e = map[res.error || ''] || { s: 500, m: 'Commande momentanément indisponible.' }
    return NextResponse.json({ ok: false, error: e.m }, { status: e.s })
  }
  return NextResponse.json({ ok: true, orderId: res.orderId, total: res.total })
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false }, { status: 400 })
  const o = await getOrderStatus(id)
  if (!o) return NextResponse.json({ ok: false }, { status: 404 })
  return NextResponse.json({ ok: true, ...o })
}
