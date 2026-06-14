import { NextRequest, NextResponse } from 'next/server'
import { loadQrGate } from '@/lib/db/game'
import { scanCookieName, signScan } from '@/lib/qr-session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/game/[slug]/scan — body { key }
 *
 * Called by the menu page when it's opened from the café QR (`?s=<key>`). If the
 * key matches the business's current qrKey, mint a signed, httpOnly scan cookie
 * valid for the owner-set TTL. That cookie is what /api/game/[slug] (spin) and
 * redemptions check. A wrong/old key mints nothing (silent) so a stale printed
 * QR simply stops granting play until the owner reprints.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = await req.json().catch(() => ({}))
  const key = typeof body.key === 'string' ? body.key : ''

  const loaded = await loadQrGate(slug)
  // Nothing to enforce → no-op success (menu still works without a gate).
  if (!loaded || !loaded.gate.enabled || !loaded.gate.qrKey) {
    return NextResponse.json({ ok: true, gated: false })
  }
  if (!key || key !== loaded.gate.qrKey) {
    return NextResponse.json({ ok: false, gated: true }, { status: 200 })
  }

  const res = NextResponse.json({ ok: true, gated: true, ttlMin: loaded.gate.ttlMin })
  res.cookies.set({
    name: scanCookieName(loaded.businessId),
    value: signScan(loaded.businessId, loaded.gate.qrKey, Date.now()),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: loaded.gate.ttlMin * 60,
  })
  return res
}
