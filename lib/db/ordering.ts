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

/** Place an order atomically (server-priced via the place_order RPC). `idem`
 *  makes retries safe — the same key returns the existing order, never a dup. */
export async function placeOrder(
  businessId: string, table: string, name: string | null, note: string | null, items: OrderItemInput[], idem?: string | null
): Promise<{ ok: boolean; orderId?: string; total?: number; error?: string }> {
  try {
    const supabase: any = await createServiceRoleClient()
    const { data, error } = await supabase.rpc('place_order', {
      p_business: businessId, p_table: table, p_name: name, p_note: note, p_items: items, p_idem: idem ?? null,
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

// ── Appel serveur (call waiter / ask for the bill) ──────────────────────────

export type ServiceCallKind = 'service' | 'bill'
export interface ServiceCall { id: string; table_number: string; kind: ServiceCallKind; created_at: string }

/**
 * Create a waiter call. Dedups: an open call for the same table+kind within the
 * last 90s returns the existing one instead of stacking duplicates (anti-spam).
 */
export async function createServiceCall(businessId: string, table: string, kind: ServiceCallKind): Promise<{ ok: boolean; id?: string }> {
  try {
    const supabase: any = await createServiceRoleClient()
    const since = new Date(Date.now() - 90_000).toISOString()
    const { data: existing } = await supabase
      .from('service_calls')
      .select('id')
      .eq('business_id', businessId).eq('table_number', table).eq('kind', kind).eq('status', 'open')
      .gte('created_at', since)
      .maybeSingle()
    if (existing?.id) return { ok: true, id: existing.id }
    const { data, error } = await supabase
      .from('service_calls')
      .insert({ business_id: businessId, table_number: table, kind })
      .select('id')
      .single()
    if (error) {
      // Unique-violation = a concurrent request already opened this exact call.
      // The DB index (service_calls_one_open) is the real dedup guarantee.
      if (error.code === '23505') return { ok: true }
      console.error('createServiceCall:', error.message)
      return { ok: false }
    }
    return { ok: true, id: data.id }
  } catch (e: any) {
    console.error('createServiceCall:', e?.message)
    return { ok: false }
  }
}

/** Admin: open calls for a business, newest first. */
export async function listServiceCalls(businessId: string): Promise<ServiceCall[]> {
  const supabase: any = await createServiceRoleClient()
  const { data } = await supabase
    .from('service_calls')
    .select('id, table_number, kind, created_at')
    .eq('business_id', businessId).eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(50)
  return (data || []) as ServiceCall[]
}

/** Admin: mark a call done (scoped to the owner's business). */
export async function resolveServiceCall(businessId: string, callId: string): Promise<boolean> {
  const supabase: any = await createServiceRoleClient()
  const { error } = await supabase
    .from('service_calls')
    .update({ status: 'done', resolved_at: new Date().toISOString() })
    .eq('id', callId).eq('business_id', businessId)
  if (error) console.error('resolveServiceCall:', error.message)
  return !error
}
