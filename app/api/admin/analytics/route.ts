import { NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveBusiness } from '@/lib/db/business'
import { requireCap } from '@/lib/access/withStaff'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'today'
  const businessSlug = searchParams.get('business_slug')

  let businessId: string

  // /api/* is NOT covered by middleware — authenticate every request here.
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  }

  if (businessSlug) {
    // Drill-down by slug is allowed only for super-admins or the business owner.
    const admin = await createServiceRoleClient()
    const { data: biz } = await (admin
      .from('businesses') as any)
      .select('id, owner_id')
      .eq('slug', businessSlug)
      .single()
    if (!biz) {
      return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    }
    const { data: profile } = await (authClient
      .from('profiles') as any)
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
    if (profile?.role !== 'super_admin' && biz.owner_id !== user.id) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    }
    businessId = biz.id
  } else {
    // Owner → own business; super_admin "Gérer comme" → the impersonated one.
    const business = await getActiveBusiness()
    if (!business) {
      return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    }
    // Staff must have reports.view (owner / PIN-off = allowed).
    const g = await requireCap('reports.view')
    if ('res' in g) return g.res
    businessId = business.id
  }

  const supabase = await createServiceRoleClient()

  const now = new Date()
  let startDate: Date
  if (period === 'week') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  } else if (period === 'month') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  } else {
    startDate = new Date(now)
    startDate.setHours(0, 0, 0, 0)
  }

  const { data: views, error } = await (supabase
    .from('menu_views') as any)
    .select('viewed_at, device_type')
    .eq('business_id', businessId)
    .gte('viewed_at', startDate.toISOString())
    .order('viewed_at', { ascending: true })

  if (error) {
    console.error('[admin/analytics] menu_views query error:', error.message)
    return NextResponse.json(
      { error: 'Impossible de charger les statistiques.' },
      { status: 500 }
    )
  }

  const total = views?.length || 0
  const mobileViews = views?.filter((v: any) => v.device_type === 'mobile').length || 0
  const desktopViews = views?.filter((v: any) => v.device_type === 'desktop').length || 0

  const dailyMap: Record<string, number> = {}
  for (const v of views || []) {
    const day = new Date(v.viewed_at).toISOString().slice(0, 10)
    dailyMap[day] = (dailyMap[day] || 0) + 1
  }
  const daily = Object.entries(dailyMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({ total, mobileViews, desktopViews, daily })
}
