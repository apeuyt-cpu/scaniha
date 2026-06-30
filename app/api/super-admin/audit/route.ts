import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { isUntrackedActor } from '@/lib/audit-exclusions'

export const dynamic = 'force-dynamic'

/**
 * "Super Eyes" feed — the platform audit log, newest first, enriched with the
 * business name/slug and the actor's email. Super-admin only.
 * Filters: ?role= ?table= ?business= ?limit=
 */
export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const sp = req.nextUrl.searchParams
    const limit = Math.min(300, Math.max(1, Number(sp.get('limit')) || 150))
    const role = sp.get('role')
    const table = sp.get('table')
    const business = sp.get('business')

    const admin = await createServiceRoleClient()
    let q = (admin.from('audit_log') as any).select('*').order('created_at', { ascending: false }).limit(limit)
    if (role) q = q.eq('actor_role', role)
    if (table) q = q.eq('table_name', table)
    if (business) q = q.eq('business_id', business)
    const { data: rows, error } = await q
    if (error) {
      // Only "relation does not exist" (table not created yet) is an empty feed;
      // surface real errors instead of masking them as "no activity".
      if ((error as any).code === '42P01') return NextResponse.json({ items: [] })
      return NextResponse.json({ error: 'Erreur lors du chargement du journal.' }, { status: 500 })
    }

    // Safety net: never surface excluded accounts (founder), even if a legacy or
    // edge-case row slipped past the source-level skip.
    const visible = (rows || []).filter((r: any) => !isUntrackedActor(r.actor))

    const bizIds = Array.from(new Set(visible.map((r: any) => r.business_id).filter(Boolean)))
    const actorIds = Array.from(new Set(visible.map((r: any) => r.actor).filter(Boolean)))
    const [bizRes, profRes] = await Promise.all([
      bizIds.length ? (admin.from('businesses') as any).select('id, name, slug').in('id', bizIds) : Promise.resolve({ data: [] }),
      actorIds.length ? (admin.from('profiles') as any).select('user_id, email').in('user_id', actorIds) : Promise.resolve({ data: [] }),
    ])
    const bizMap = new Map<string, any>((bizRes.data || []).map((b: any) => [b.id, b]))
    const profMap = new Map<string, any>((profRes.data || []).map((p: any) => [p.user_id, p.email]))

    const items = visible.map((r: any) => ({
      ...r,
      business_name: bizMap.get(r.business_id)?.name || null,
      business_slug: bizMap.get(r.business_id)?.slug || null,
      actor_email: profMap.get(r.actor) || null,
    }))
    return NextResponse.json({ items })
  } catch (error: any) {
    if (error?.digest?.startsWith?.('NEXT_REDIRECT') || error?.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }
}
