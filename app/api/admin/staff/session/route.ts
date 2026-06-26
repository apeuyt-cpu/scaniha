import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireOwner } from '@/lib/auth'
import { getActiveBusiness } from '@/lib/db/business'
import { verifyStaffPin, logStaffAction } from '@/lib/db/staff'
import { signStaffSession, staffCookieName, STAFF_SESSION_TTL_MIN } from '@/lib/staff-session'
import { checkRateLimit } from '@/lib/api/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * Staff PIN session: identify the employee at the terminal (the café account is
 * already logged in). POST { action }:
 *   'unlock' { staffId, pin } → verify PIN (per-staff lockout) → set signed cookie
 *   'owner'                   → account-owner bypass (full access; never locked out)
 *   'lock'                    → clear the cookie ("changer d'utilisateur")
 */
export async function POST(request: Request) {
  try {
    const { profile } = await requireOwner()
    const business = await getActiveBusiness()
    if (!business) return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    const body = await request.json().catch(() => ({}))
    const action = String(body?.action || '')
    const jar = await cookies()
    const name = staffCookieName(business.id)
    const cookieOpts = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', maxAge: STAFF_SESSION_TTL_MIN * 60 }

    if (action === 'lock') {
      jar.set(name, '', { ...cookieOpts, maxAge: 0 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'owner') {
      // The logged-in account IS the café owner (or a super-admin managing it) —
      // they hold the master login, so this can never lock them out.
      jar.set(name, signStaffSession(business.id, 'owner', Date.now()), cookieOpts)
      await logStaffAction({ businessId: business.id, action: 'staff_login', actorLabel: 'Propriétaire', detail: profile.role === 'super_admin' ? 'super_admin' : 'owner' })
      return NextResponse.json({ ok: true, role: 'owner' })
    }

    if (action === 'unlock') {
      const staffId = typeof body?.staffId === 'string' ? body.staffId : ''
      const pin = typeof body?.pin === 'string' ? body.pin : ''
      if (!staffId || !pin) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
      // throttle PIN attempts per business (best-effort surface guard; the RPC has the real per-staff lockout).
      const rl = checkRateLimit(`staff:unlock:${business.id}`, { perMinute: 12, perDay: 300 })
      if (!rl.ok) return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 })
      const r = await verifyStaffPin(business.id, staffId, pin)
      if (!r.ok) {
        const msg = r.error === 'locked' ? 'Compte bloqué. Réessayez plus tard ou demandez au responsable.' : 'Code PIN incorrect.'
        return NextResponse.json({ error: msg, locked: r.error === 'locked' }, { status: 401 })
      }
      jar.set(name, signStaffSession(business.id, r.staffId!, Date.now()), cookieOpts)
      await logStaffAction({ businessId: business.id, branchId: r.branchId ?? null, actorStaff: r.staffId, actorLabel: r.label, action: 'staff_login' })
      return NextResponse.json({ ok: true, role: r.role, label: r.label })
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  } catch (e: any) {
    if (e?.digest?.startsWith?.('NEXT_REDIRECT') || e?.message === 'NEXT_REDIRECT') throw e
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }
}
