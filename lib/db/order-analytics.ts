import { createServiceRoleClient } from '@/lib/supabase/server'
import { tnLocalDate } from '@/lib/tz'

// Owner sales KPIs computed from the orders the café actually received. Revenue
// counts every non-rejected order (placed = a real sale; pay-at-table). Service
// role + the businessId from getActiveBusiness is the auth boundary (the route
// gates with requireOwner first).

export interface OrderStats {
  days: number
  revenue: number
  orderCount: number
  aov: number
  byDay: { date: string; revenue: number; count: number }[]
  topItems: { name: string; qty: number; revenue: number }[]
}

export async function getOrderStats(businessId: string, days = 30): Promise<OrderStats> {
  const supabase: any = await createServiceRoleClient()
  const since = new Date(Date.now() - days * 86_400_000).toISOString()

  const { data: ordersRaw } = await supabase
    .from('orders')
    .select('id, total, created_at')
    .eq('business_id', businessId)
    .neq('status', 'rejected')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(3000)
  const orders = (ordersRaw || []) as { id: string; total: number; created_at: string }[]

  const revenue = orders.reduce((s, o) => s + (Number(o.total) || 0), 0)
  const orderCount = orders.length
  const aov = orderCount ? revenue / orderCount : 0

  // Revenue per Tunisia-local calendar day, oldest → newest (empty days = 0).
  const dayMap = new Map<string, { revenue: number; count: number }>()
  orders.forEach((o) => {
    const t = new Date(o.created_at).getTime()
    const d = Number.isFinite(t) ? tnLocalDate(t) : ''
    if (!d) return
    const e = dayMap.get(d) || { revenue: 0, count: 0 }
    e.revenue += Number(o.total) || 0
    e.count += 1
    dayMap.set(d, e)
  })
  const byDay: OrderStats['byDay'] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = tnLocalDate(Date.now() - i * 86_400_000)
    const e = dayMap.get(d) || { revenue: 0, count: 0 }
    byDay.push({ date: d, revenue: e.revenue, count: e.count })
  }

  // Top items by revenue — aggregate line items across ALL fetched orders (same
  // bound as revenue/count, so the figures stay consistent). The order_items
  // fetch is chunked (200 ids) to stay under PostgREST URL limits.
  let topItems: OrderStats['topItems'] = []
  if (orders.length > 0) {
    const ids = orders.map((o) => o.id)
    const agg = new Map<string, { qty: number; revenue: number }>()
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200)
      const { data: items } = await supabase.from('order_items').select('order_id, name, price, qty').in('order_id', chunk)
      ;((items || []) as any[]).forEach((it) => {
        const name = String(it.name || '').trim() || '—'
        const e = agg.get(name) || { qty: 0, revenue: 0 }
        e.qty += Number(it.qty) || 0
        e.revenue += (Number(it.price) || 0) * (Number(it.qty) || 0)
        agg.set(name, e)
      })
    }
    topItems = Array.from(agg.entries())
      .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
  }

  return { days, revenue, orderCount, aov, byDay, topItems }
}
