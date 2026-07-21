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
 * Diner-account endpoint — GLOBAL identity (one account per phone, valid at every
 * café). The [slug] is kept for the per-café hub entry: signup passes it so THIS
 * café's welcome bonus is granted, but login/me/logout are café-independent (a
 * token issued anywhere works everywhere — per-café data is scoped at the
 * game/loyalty routes by slug + the server-derived phone). The café-less wallet
 * uses the sibling /api/account route.
 *
 *   POST { action: 'signup' | 'login' | 'me' | 'logout', phone?, password?, name?, token? }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
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
    const r = await dinerSignup(String(body.phone || ''), String(body.password || ''), body.name ? String(body.name) : undefined, slug)
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
    return NextResponse.json({ ok: true, phone: r.phone, name: r.name, age: r.age }, { status: 200 })
  }
  if (action === 'logout') {
    await dinerLogout(typeof body.token === 'string' ? body.token : null)
    return NextResponse.json({ ok: true })
  }
  if (action === 'update_profile') {
    const r = await dinerSession(typeof body.token === 'string' ? body.token : null)
    if (!r.ok) return NextResponse.json({ ok: false }, { status: 401 })
    
    const { updateDinerProfile } = require('@/lib/db/account')
    
    const name = typeof body.name === 'string' && body.name.trim() !== '' ? body.name.trim() : null
    const age = typeof body.age === 'number' && body.age >= 1 && body.age <= 120 ? body.age : null
    
    const success = await updateDinerProfile(r.phone, name, age)
    if (success) {
      return NextResponse.json({ ok: true, name, age }, { status: 200 })
    }
    return NextResponse.json({ ok: false, error: 'Impossible de mettre à jour le profil.' }, { status: 500 })
  }

  return NextResponse.json({ ok: false, error: 'Action inconnue.' }, { status: 400 })
}
