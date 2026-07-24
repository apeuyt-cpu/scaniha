import { NextRequest, NextResponse } from 'next/server'
import { loadOrderingGate, placeOrder, getOrderStatus } from '@/lib/db/ordering'
import { orderScanCookieName, verifyOrderScan } from '@/lib/qr-session'
import { sanitizeCart } from '@/lib/orders'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { clientIp } from '@/lib/api/client-ip'
import { isNetworkAllowed } from '@/lib/order-network'

export const runtime = 'nodejs'

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

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
  const ip = clientIp(req)
  if (gate.wifiOnly && !isNetworkAllowed(ip, gate.wifiCidrs)) {
    return NextResponse.json({ ok: false, networkRequired: true, error: 'Connectez-vous au Wi-Fi du café pour commander.' }, { status: 403 })
  }
  const cookie = req.cookies.get(orderScanCookieName(gate.businessId))?.value
  const trustedTable = verifyOrderScan(cookie, gate.businessId, gate.qrKey, gate.ttlMin, gate.tables)
  if (!trustedTable) {
    return NextResponse.json({ ok: false, rescanRequired: true, error: 'Scannez le QR de votre table pour commander.' }, { status: 403 })
  }

  // Per-IP throttle on a public write (spoof-resistant IP).
  const rl = checkRateLimit(`order:${gate.businessId}:${trustedTable}:${ip}`, { perMinute: 3, perDay: 30 })
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'Trop de commandes. Réessayez dans un instant.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  }

  const body = await req.json().catch(() => ({}))
  
  // GPS Geolocation Gate
  if (gate.gpsOnly && gate.gpsLat !== null && gate.gpsLng !== null) {
    const userLat = Number(body?.lat)
    const userLng = Number(body?.lng)
    
    if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
      return NextResponse.json({ ok: false, gpsRequired: true, error: 'Vous devez autoriser la localisation pour commander depuis votre table.' }, { status: 403 })
    }
    
    const distance = getDistanceInMeters(gate.gpsLat, gate.gpsLng, userLat, userLng)
    if (distance > gate.gpsRadius) {
      return NextResponse.json({ ok: false, gpsRejected: true, error: 'Vous devez être physiquement au restaurant pour commander.' }, { status: 403 })
    }
  }

  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 60) : null
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 300) : null
  // Client idempotency key (per cart) → safe retries, no duplicate orders.
  const idem = typeof body?.idem === 'string' ? body.idem.trim().slice(0, 64) || null : null
  const items = sanitizeCart(body?.items)
  if (items.length === 0) {
    return NextResponse.json({ ok: false, error: 'Votre panier est vide.' }, { status: 400 })
  }

  const res = await placeOrder(gate.businessId, String(trustedTable), name, note, items, idem)
  if (!res.ok) {
    const map: Record<string, { s: number; m: string }> = {
      no_table: { s: 400, m: 'Numéro de table manquant.' },
      empty: { s: 400, m: 'Votre panier est vide.' },
      no_valid_items: { s: 409, m: 'Ces articles ne sont plus disponibles.' },
    }
    const e = map[res.error || ''] || { s: 500, m: 'Commande momentanément indisponible.' }
    return NextResponse.json({ ok: false, error: e.m }, { status: e.s })
  }
  return NextResponse.json({ ok: true, orderId: res.orderId, total: res.total, table: String(trustedTable) })
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false }, { status: 400 })
  const o = await getOrderStatus(id)
  if (!o) return NextResponse.json({ ok: false }, { status: 404 })
  return NextResponse.json({ ok: true, ...o })
}
