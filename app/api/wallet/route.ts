import { NextRequest, NextResponse } from 'next/server'
import { dinerSession } from '@/lib/db/account'
import { loadWallet } from '@/lib/db/wallet'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/wallet — the diner's loyalty portefeuille: every fidelity-live café
 * where their phone has activity, with each café's own balance + mode.
 *
 * Auth: a global diner token in `Authorization: Bearer <token>`. The phone is
 * derived from the token server-side — a client can NEVER pass someone else's
 * phone to enumerate their cafés.
 *   → { ok: true, cafes: WalletCafe[] } | { ok: false } (401)
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null

  const session = await dinerSession(token)
  if (!session.ok) return NextResponse.json({ ok: false }, { status: 401 })

  const cafes = await loadWallet(session.phone)
  return NextResponse.json({ ok: true, name: session.name, phone: session.phone, cafes })
}
