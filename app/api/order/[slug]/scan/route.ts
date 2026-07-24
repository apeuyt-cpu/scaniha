import { NextRequest, NextResponse } from 'next/server'
import { loadOrderingGate } from '@/lib/db/ordering'
import { orderScanCookieName, signOrderScan, tableOrderQrKey } from '@/lib/qr-session'
import { isNetworkAllowed } from '@/lib/order-network'
import { clientIp } from '@/lib/api/client-ip'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/order/[slug]/scan — body { key }
 * Mints the table-ordering presence cookie when the menu is opened from a TABLE
 * QR (`?s=<orderingQrKey>`). A non-matching key (e.g. a game/play QR) mints
 * nothing, so only a genuine table scan unlocks ordering. Pinged by QrScanMint.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = await req.json().catch(() => ({}))
  const key = typeof body.key === 'string' ? body.key : ''
  const table = Number(body.table)

  const gate = await loadOrderingGate(slug)
  if (!gate || !gate.enabled || !gate.qrKey) return NextResponse.json({ ok: true, gated: false })
  if (gate.wifiOnly && !isNetworkAllowed(clientIp(req), gate.wifiCidrs)) {
    return NextResponse.json({ ok: false, gated: true, networkRequired: true }, { status: 403 })
  }
  const expectedKey = Number.isInteger(table) && table >= 1 && table <= gate.tables
    ? tableOrderQrKey(gate.qrKey, table)
    : ''
  if (!key || !expectedKey || key !== expectedKey) return NextResponse.json({ ok: false, gated: true }, { status: 200 })

  const res = NextResponse.json({ ok: true, gated: true, ttlMin: gate.ttlMin })
  res.cookies.set({
    name: orderScanCookieName(gate.businessId),
    value: signOrderScan(gate.businessId, gate.qrKey, table, Date.now()),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: gate.ttlMin * 60,
  })
  return res
}
