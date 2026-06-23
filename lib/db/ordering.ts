import { createServiceRoleClient } from '@/lib/supabase/server'
import { orderingConfig } from '@/lib/design-settings'
import type { Order, OrderItemInput, OrderStatus } from '@/lib/orders'

/**
 * SERVER-ONLY: the business id + ordering presence gate (qrKey/ttl) for a slug.
 * The qrKey never leaves the server — it's used only to verify the scan cookie.
 */
export async function loadOrderingGate(slug: string): Promise<{ businessId: string; enabled: boolean; qrKey: string; ttlMin: number } | null> {
  try {
    const supabase: any = await createServiceRoleClient()
    const { data: business } = await supabase
      .from('businesses')
      .select('id, design_settings')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle()
    if (!business) return null
    const o = orderingConfig(business)
    return { businessId: business.id, enabled: o.enabled, qrKey: o.qrKey, ttlMin: o.ttlMin }
  } catch {
    return null
  }
}

/** Place an order atomically (server-priced via the place_order RPC). */
export async function placeOrder(
  businessId: string, table: string, name: string | null, note: string | null, items: OrderItemInput[]
): Promise<{ ok: boolean; orderId?: string; total?: number; error?: string }> {
  try {
    const supabase: any = await createServiceRoleClient()
    const { data, error } = await supabase.rpc('place_order', {
      p_business: businessId, p_table: table, p_name: name, p_note: note, p_items: items,
    })
    if (error) { console.error('place_order:', error.message); return { ok: false, error: 'server' } }
    return (data as any) || { ok: false, error: 'server' }
  } catch (e: any) {
    console.error('placeOrder:', e?.message)
    return { ok: false, error: 'server' }
  }
}

/** Public status of ONE order by id (unguessable uuid) — minimal fields, no leak. */
export async function getOrderStatus(orderId: string): Promise<{ status: OrderStatus; table_number: string; total: number; created_at: string } | null> {
  try {
    const supabase: any = await createServiceRoleClient()
    const { data } = await supabase.from('orders').select('status, table_number, total, created_at').eq('id', orderId).maybeSingle()
    return (data as any) || null
  } catch {
    return null
  }
}

/** Admin: all orders for a business (newest first), with their line items. */
export async function listOrders(businessId: string): Promise<Order[]> {
  const supabase: any = await createServiceRoleClient()
  const { data: orders } = await supabase
    .from('orders')
    .select('id, table_number, status, customer_name, note, total, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(200)
  const list = (orders || []) as any[]
  if (list.length === 0) return []
  const ids = list.map((o) => o.id)
  const { data: items } = await supabase.from('order_items').select('id, order_id, name, price, qty').in('order_id', ids)
  const byOrder = new Map<string, any[]>()
  ;(items || []).forEach((it: any) => { const a = byOrder.get(it.order_id) || []; a.push(it); byOrder.set(it.order_id, a) })
  return list.map((o) => ({ ...o, items: byOrder.get(o.id) || [] }))
}

/** Admin: move an order to a new status (scoped to the owner's business). */
export async function updateOrderStatus(businessId: string, orderId: string, status: OrderStatus): Promise<boolean> {
  const supabase: any = await createServiceRoleClient()
  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId).eq('business_id', businessId)
  if (error) console.error('updateOrderStatus:', error.message)
  return !error
}
