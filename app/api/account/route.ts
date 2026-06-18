import { NextRequest, NextResponse } from 'next/server'
import { dinerSignup, dinerLogin, dinerSession, dinerLogout } from '@/lib/db/account'

/**
 * Café-less diner-account endpoint for the WALLET (Portefeuille fidélité). Same
 * GLOBAL identity as /api/account/[slug], but with no café context: wallet signup
 * grants NO welcome bonus (no café to attribute it to — those are granted when the
 * diner first acts at a specific café). The token is global and works at every café.
 *
 *   POST { action: 'signup' | 'login' | 'me' | 'logout', phone?, password?, name?, token? }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const action = String(body?.action || '')

  if (action === 'signup') {
    const r = await dinerSignup(String(body.phone || ''), String(body.password || ''), body.name ? String(body.name) : undefined)
    return NextResponse.json(r, { status: r.ok ? 200 : 400 })
  }
  if (action === 'login') {
    const r = await dinerLogin(String(body.phone || ''), String(body.password || ''))
    return NextResponse.json(r, { status: r.ok ? 200 : 401 })
  }
  if (action === 'me') {
    const r = await dinerSession(typeof body.token === 'string' ? body.token : null)
    if (!r.ok) return NextResponse.json({ ok: false }, { status: 401 })
    return NextResponse.json({ ok: true, phone: r.phone, name: r.name }, { status: 200 })
  }
  if (action === 'logout') {
    await dinerLogout(typeof body.token === 'string' ? body.token : null)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: false, error: 'Action inconnue.' }, { status: 400 })
}
