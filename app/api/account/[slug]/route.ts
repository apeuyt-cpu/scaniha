import { NextRequest, NextResponse } from 'next/server'
import { dinerSignup, dinerLogin, dinerSession, dinerLogout } from '@/lib/db/account'
import { loadQrGate } from '@/lib/db/game'

/**
 * Public diner-account endpoint (phone + password, per business by slug).
 *   POST { action: 'signup' | 'login' | 'me' | 'logout', phone?, password?, name?, token? }
 *     signup/login → { ok, token, phone, name } | { ok:false, error }
 *     me           → { ok, phone, name }        | { ok:false }
 *     logout       → { ok:true }
 * The returned `token` is a session the client stores (localStorage) and sends
 * back as `token` to play the game (/api/game/[slug]) or load the account.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = await req.json().catch(() => ({}))
  const action = String(body?.action || '')

  if (action === 'signup') {
    const r = await dinerSignup(slug, String(body.phone || ''), String(body.password || ''), body.name ? String(body.name) : undefined)
    return NextResponse.json(r, { status: r.ok ? 200 : 400 })
  }
  if (action === 'login') {
    const r = await dinerLogin(slug, String(body.phone || ''), String(body.password || ''))
    return NextResponse.json(r, { status: r.ok ? 200 : 401 })
  }
  if (action === 'me') {
    const r = await dinerSession(typeof body.token === 'string' ? body.token : null)
    if (!r.ok) return NextResponse.json({ ok: false }, { status: 401 })
    // Pin the token to this café — a session is per-business, so a café-A token
    // must not resolve an account against café B's slug.
    const biz = await loadQrGate(slug)
    if (r.businessId && biz && biz.businessId !== r.businessId) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }
    return NextResponse.json({ ok: true, phone: r.phone, name: r.name }, { status: 200 })
  }
  if (action === 'logout') {
    await dinerLogout(typeof body.token === 'string' ? body.token : null)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: false, error: 'Action inconnue.' }, { status: 400 })
}
