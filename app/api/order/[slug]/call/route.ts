import { NextRequest, NextResponse } from 'next/server'
import { loadOrderingGate, createServiceCall, type ServiceCallKind } from '@/lib/db/ordering'
import { orderScanCookieName, verifyOrderScan } from '@/lib/qr-session'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { clientIp } from '@/lib/api/client-ip'
import { isNetworkAllowed } from '@/lib/order-network'

export const runtime = 'nodejs'

/**
 * Public "appel serveur" endpoint (by café slug).
 *   POST {table, kind?: 'service'|'bill'} → raise a waiter call.
 *
 * Same presence gate as placing an order: the diner must have scanned this
 * café's table QR recently. No payment, no auth — just a signal to the staff.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const gate = await loadOrderingGate(slug)
  if (!gate || !gate.enabled || !gate.qrKey) {
    return NextResponse.json({ ok: false, error: 'Service indisponible.' }, { status: 404 })
  }

  const ip = clientIp(req)
  if (gate.wifiOnly && !isNetworkAllowed(ip, gate.wifiCidrs)) {
    return NextResponse.json({ ok: false, networkRequired: true, error: 'Connectez-vous au Wi-Fi du café.' }, { status: 403 })
  }
  const cookie = req.cookies.get(orderScanCookieName(gate.businessId))?.value
  const trustedTable = verifyOrderScan(cookie, gate.businessId, gate.qrKey, gate.ttlMin, gate.tables)
  if (!trustedTable) {
    return NextResponse.json({ ok: false, rescanRequired: true, error: 'Scannez le QR de votre table.' }, { status: 403 })
  }

  const rl = checkRateLimit(`call:${gate.businessId}:${trustedTable}:${ip}`, { perMinute: 3, perDay: 30 })
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'Patientez un instant avant de rappeler.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  }

  const body = await req.json().catch(() => ({}))
  const table = typeof body?.table === 'string' ? body.table.trim().slice(0, 40) : ''
  const kind: ServiceCallKind = body?.kind === 'bill' ? 'bill' : 'service'
  if (!table) {
    return NextResponse.json({ ok: false, error: 'Numéro de table manquant.' }, { status: 400 })
  }

  const res = await createServiceCall(gate.businessId, String(trustedTable), kind)
  if (!res.ok) return NextResponse.json({ ok: false, error: 'Service momentanément indisponible.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
