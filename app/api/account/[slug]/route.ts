import { NextRequest, NextResponse } from 'next/server'
import { dinerSignup, dinerLogin, dinerSession, dinerLogout } from '@/lib/db/account'

/**
 * Diner-account endpoint — GLOBAL identity (one account per phone, across every
 * café). The [slug] in the path is kept for URL/back-compat but is NOT used to
 * scope the account: a customer signs up/logs in once and is recognized at any
 * café. Per-café loyalty data is scoped by the slug at the game/loyalty routes.
 *
 *   POST { action: 'signup' | 'login' | 'me' | 'logout', phone?, password?, name?, token? }
 *     signup/login → { ok, token, phone, name } | { ok:false, error }
 *     me           → { ok, phone, name }        | { ok:false }
 *     logout       → { ok:true }
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
