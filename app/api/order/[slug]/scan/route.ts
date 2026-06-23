import { NextRequest, NextResponse } from 'next/server'
import { loadOrderingGate } from '@/lib/db/ordering'
import { orderScanCookieName, signScan } from '@/lib/qr-session'

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

  const gate = await loadOrderingGate(slug)
  if (!gate || !gate.enabled || !gate.qrKey) return NextResponse.json({ ok: true, gated: false })
  if (!key || key !== gate.qrKey) return NextResponse.json({ ok: false, gated: true }, { status: 200 })

  const res = NextResponse.json({ ok: true, gated: true, ttlMin: gate.ttlMin })
  res.cookies.set({
    name: orderScanCookieName(gate.businessId),
    value: signScan(gate.businessId, gate.qrKey, Date.now()),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: gate.ttlMin * 60,
  })
  return res
}
