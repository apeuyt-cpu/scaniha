import { NextRequest, NextResponse } from 'next/server'
import { dinerSignup, dinerLogin, dinerSession, dinerLogout } from '@/lib/db/account'
import { checkRateLimit } from '@/lib/api/rate-limit'

/** Client IP from the proxy chain, best-effort (middleware excludes /api). */
function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

/** Generic French 429 (don't reveal whether the phone exists). */
function tooMany(retryAfter: number) {
  return NextResponse.json(
    { ok: false, error: 'Trop de tentatives. Réessayez dans un instant.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  )
}

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
  const ip = clientIp(req)

  if (action === 'signup') {
    // Strict HTTP throttle (the 4-digit PIN space is tiny; middleware skips /api).
    const ipLimit = checkRateLimit('signup-ip:' + ip, { perMinute: 5, perDay: 50 })
    if (!ipLimit.ok) return tooMany(ipLimit.retryAfter)
    // Per-phone cap too, so a rotating-IP actor can't spam-signup or squat a number
    // (digit-keyed to dodge format tricks). Pairs with the per-(business,phone) DB controls.
    const phoneKey = String(body.phone || '').replace(/[^\d]/g, '')
    if (phoneKey) {
      const phoneLimit = checkRateLimit('signup-phone:' + phoneKey, { perMinute: 3, perDay: 15 })
      if (!phoneLimit.ok) return tooMany(phoneLimit.retryAfter)
    }
    const r = await dinerSignup(String(body.phone || ''), String(body.password || ''), body.name ? String(body.name) : undefined)
    return NextResponse.json(r, { status: r.ok ? 200 : 400 })
  }
  if (action === 'login') {
    // Throttle brute-force of the 4-digit PIN: per-IP and per-phone (per-account
    // DB lockout still applies on top). Generic 429 so we don't leak phone validity.
    const phone = String(body.phone || '')
    const ipLimit = checkRateLimit('login-ip:' + ip, { perMinute: 10 })
    if (!ipLimit.ok) return tooMany(ipLimit.retryAfter)
    const phoneLimit = checkRateLimit('login-phone:' + phone, { perMinute: 5 })
    if (!phoneLimit.ok) return tooMany(phoneLimit.retryAfter)
    const r = await dinerLogin(phone, String(body.password || ''))
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
