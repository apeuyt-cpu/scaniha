import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { isSelfSignupEnabled, setSelfSignupEnabled } from '@/lib/db/platform-settings'

// Super-admin control for the public onboarding mode:
//   selfSignup=false → visitors must fill /business-request (Demandes queue).
//   selfSignup=true  → visitors can create their own account at /signup.
// The /signup and /business-request pages cross-redirect based on this setting,
// so flipping it here changes the whole public funnel without touching CTAs.

export async function GET() {
  try {
    await requireSuperAdmin()
    const selfSignup = await isSelfSignupEnabled()
    return NextResponse.json({ selfSignup }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    if (e?.digest?.startsWith?.('NEXT_REDIRECT') || e?.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }
    console.error('[super-admin/signup-mode] GET error:', e?.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { user: actor } = await requireSuperAdmin()
    const body = await request.json().catch(() => ({}))
    if (typeof body.selfSignup !== 'boolean') {
      return NextResponse.json({ error: 'Paramètre selfSignup (booléen) requis.' }, { status: 400 })
    }
    await setSelfSignupEnabled(body.selfSignup)
    console.warn(
      `[AUDIT] super-admin ${actor.id} (${actor.email ?? 'n/a'}) set self_signup=${body.selfSignup} at ${new Date().toISOString()}`,
    )
    return NextResponse.json({ ok: true, selfSignup: body.selfSignup })
  } catch (e: any) {
    if (e?.digest?.startsWith?.('NEXT_REDIRECT') || e?.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }
    console.error('[super-admin/signup-mode] POST error:', e?.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
