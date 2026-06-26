import { NextResponse } from 'next/server'
import { withStaff } from '@/lib/access/withStaff'
import { getOrderStats } from '@/lib/db/order-analytics'

export const dynamic = 'force-dynamic'

/** Owner/staff sales KPIs from orders. GET ?days=7|30|90 (default 30). reports.view. */
export const GET = withStaff('reports.view', async (request, { business }) => {
  const daysRaw = Number(new URL(request.url).searchParams.get('days'))
  const days = daysRaw === 7 || daysRaw === 90 ? daysRaw : 30
  const stats = await getOrderStats(business.id, days)
  return NextResponse.json(stats)
})
