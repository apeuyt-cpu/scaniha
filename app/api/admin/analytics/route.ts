import { NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'today'
  const businessSlug = searchParams.get('business_slug')

  let businessId: string

  if (businessSlug) {
    const supabase = await createServiceRoleClient()
    const { data: biz } = await (supabase
      .from('businesses') as any)
      .select('id')
      .eq('slug', businessSlug)
      .single()
    if (!biz) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    businessId = biz.id
  } else {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: business } = await (supabase
      .from('businesses') as any)
      .select('id')
      .eq('owner_id', user.id)
      .single()
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
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
    return NextResponse.json({ error: error.message }, { status: 500 })
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
