import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { IMPERSONATION_COOKIE } from '@/lib/admin-impersonation'

/**
 * Super-admin impersonation ("Gérer comme l'établissement").
 *   POST {businessId} → start acting as that business (sets the sa_business cookie).
 *   DELETE             → stop (clears the cookie).
 * The cookie is only ever honoured for a server-verified super_admin, so this is
 * just UX convenience over what the super_admin role already permits.
 */

const cookieOpts = {
  httpOnly: true as const,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const body = await req.json().catch(() => ({}))
    const businessId = typeof body?.businessId === 'string' ? body.businessId : null
    if (!businessId) {
      return NextResponse.json({ error: 'businessId requis.' }, { status: 400 })
    }
    const admin = await createServiceRoleClient()
    const { data: biz } = await (admin.from('businesses') as any).select('id').eq('id', businessId).maybeSingle()
    if (!biz) {
      return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    }
    const res = NextResponse.json({ ok: true })
    res.cookies.set(IMPERSONATION_COOKIE, businessId, { ...cookieOpts, maxAge: 60 * 60 * 8 })
    return res
  } catch (error: any) {
    if (error?.digest?.startsWith?.('NEXT_REDIRECT') || error?.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }
}

export async function DELETE() {
  // Clearing is harmless (the cookie is ignored for non-super-admins anyway).
  const res = NextResponse.json({ ok: true })
  res.cookies.set(IMPERSONATION_COOKIE, '', { ...cookieOpts, maxAge: 0 })
  return res
}
