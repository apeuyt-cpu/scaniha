import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { getImpersonatedBusinessId } from '@/lib/admin-impersonation'

/**
 * Records a page visit in the audit log ("Super Eyes") — only for /admin and
 * /super-admin pages, only for a signed-in owner/super_admin. Best-effort.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const path = typeof body?.path === 'string' ? body.path.slice(0, 200) : null
    if (!path || !(path.startsWith('/admin') || path.startsWith('/super-admin'))) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })
    const { data: profile } = await (supabase.from('profiles') as any).select('role').eq('user_id', user.id).maybeSingle()
    if (!profile || (profile.role !== 'owner' && profile.role !== 'super_admin')) {
      return NextResponse.json({ ok: false }, { status: 403 })
    }
    const businessId = profile.role === 'super_admin' ? await getImpersonatedBusinessId() : null
    await logAudit({ actor: user.id, actorRole: profile.role, action: 'page.view', table: 'page', detail: path, businessId })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
