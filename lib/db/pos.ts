import { createServiceRoleClient } from '@/lib/supabase/server'
import { normPhone } from '@/lib/db/loyalty'
import type { PosProduct, Sale, SaleLine, PaymentInput } from '@/lib/pos/types'

// All writes go through SECURITY DEFINER RPCs (server-priced, atomic) — the
// client total is never trusted. Reads are service-role, scoped by business_id.

/** Ensure the org has a primary branch; returns its id. */
export async function ensurePrimaryBranch(businessId: string, name: string): Promise<string | null> {
  try {
    const sb: any = await createServiceRoleClient()
    const { data, error } = await sb.rpc('pos_ensure_primary_branch', { p_business: businessId, p_name: name })
    if (error) { console.error('pos_ensure_primary_branch:', error.message); return null }
    return (data as string) || null
  } catch (e: any) { console.error('ensurePrimaryBranch:', e?.message); return null }
}

/** Catalog products for the terminal grid. */
export async function listProducts(businessId: string): Promise<PosProduct[]> {
  const sb: any = await createServiceRoleClient()
  const { data } = await sb
    .from('pos_products')
    .select('id, category, name, price, tax_rate, color, image_url, available, sort')
    .eq('business_id', businessId)
    .eq('available', true)
    .order('sort', { ascending: true })
    .order('name', { ascending: true })
    .limit(500)
  return ((data || []) as any[]).map((p) => ({
    id: p.id, category: p.category, name: p.name, price: Number(p.price), tax_rate: Number(p.tax_rate),
    color: p.color, image_url: p.image_url, available: p.available, sort: p.sort,
  }))
}

export async function openSale(
  businessId: string, branchId: string | null,
  opts: { tableId?: string | null; tableLabel?: string | null; openedBy?: string | null; server?: string | null }
): Promise<{ ok: boolean; saleId?: string; error?: string }> {
  const sb: any = await createServiceRoleClient()
  const { data, error } = await sb.rpc('pos_open_sale', {
    p_business: businessId, p_branch: branchId, p_table: opts.tableId ?? null,
    p_table_label: opts.tableLabel ?? null, p_opened_by: opts.openedBy ?? null, p_server: opts.server ?? null,
  })
  if (error) { console.error('pos_open_sale:', error.message); return { ok: false, error: 'server' } }
  return (data as any) || { ok: false, error: 'server' }
}

export async function addLine(
  businessId: string, saleId: string, productId: string, qty: number, modifiers: any[]
): Promise<{ ok: boolean; error?: string }> {
  const sb: any = await createServiceRoleClient()
  const { data, error } = await sb.rpc('pos_add_line', {
    p_business: businessId, p_sale: saleId, p_product: productId, p_qty: qty, p_modifiers: modifiers || [],
  })
  if (error) { console.error('pos_add_line:', error.message); return { ok: false, error: 'server' } }
  return (data as any) || { ok: false, error: 'server' }
}

export async function setLine(
  businessId: string, saleId: string, lineId: string, qty: number
): Promise<{ ok: boolean; error?: string }> {
  const sb: any = await createServiceRoleClient()
  const { data, error } = await sb.rpc('pos_set_line', { p_business: businessId, p_sale: saleId, p_line: lineId, p_qty: qty })
  if (error) { console.error('pos_set_line:', error.message); return { ok: false, error: 'server' } }
  return (data as any) || { ok: false, error: 'server' }
}

export async function applyDiscount(
  businessId: string, saleId: string, kind: 'pct' | 'amount' | null, value: number
): Promise<{ ok: boolean; error?: string }> {
  const sb: any = await createServiceRoleClient()
  const { data, error } = await sb.rpc('pos_apply_discount', { p_business: businessId, p_sale: saleId, p_kind: kind, p_value: value })
  if (error) { console.error('pos_apply_discount:', error.message); return { ok: false, error: 'server' } }
  return (data as any) || { ok: false, error: 'server' }
}

export async function pay(
  businessId: string, saleId: string, payments: PaymentInput[], idemKey: string, paidBy: string | null, phone?: string | null
): Promise<{ ok: boolean; total?: number; change?: number; error?: string; loyalty?: any }> {
  const sb: any = await createServiceRoleClient()
  // Normalize the phone the SAME way the manual caisse does, so a customer
  // credited via the POS and via the manual caisse share one ledger key.
  const p_phone = phone ? normPhone(phone) : null
  const { data, error } = await sb.rpc('pos_pay', {
    p_business: businessId, p_sale: saleId, p_payments: payments, p_idem: idemKey, p_paid_by: paidBy, p_phone,
  })
  if (error) { console.error('pos_pay:', error.message); return { ok: false, error: 'server' } }
  return (data as any) || { ok: false, error: 'server' }
}

/**
 * One-shot atomic checkout: create the sale from a local cart, reprice every
 * line server-side, pay, and credit loyalty — in a single round-trip. Powers the
 * instant (latency-free) terminal. Idempotent via idemKey.
 */
export async function checkout(
  businessId: string, branchId: string | null,
  lines: { productId: string; qty: number; modifiers?: any[] }[],
  discount: { kind: 'pct' | 'amount' | null; value: number },
  payments: PaymentInput[], idemKey: string, paidBy: string | null, phone?: string | null
): Promise<{ ok: boolean; saleId?: string; total?: number; change?: number; error?: string; loyalty?: any }> {
  const sb: any = await createServiceRoleClient()
  const p_phone = phone ? normPhone(phone) : null
  const { data, error } = await sb.rpc('pos_checkout', {
    p_business: businessId, p_branch: branchId, p_lines: lines,
    p_discount_kind: discount.kind, p_discount_value: discount.value,
    p_payments: payments, p_idem: idemKey, p_paid_by: paidBy, p_phone,
  })
  if (error) { console.error('pos_checkout:', error.message); return { ok: false, error: 'server' } }
  return (data as any) || { ok: false, error: 'server' }
}

/** Full ticket (header + lines) for hydrating the terminal. */
export async function getSale(businessId: string, saleId: string): Promise<Sale | null> {
  const sb: any = await createServiceRoleClient()
  const { data: s } = await sb
    .from('pos_sales')
    .select('id, status, table_label, server_label, subtotal, discount_kind, discount_value, discount_total, tax_total, total, created_at')
    .eq('id', saleId).eq('business_id', businessId).maybeSingle()
  if (!s) return null
  const { data: items } = await sb
    .from('pos_sale_items')
    .select('id, product_id, name, unit_price, qty, tax_rate, modifiers, line_total, void')
    .eq('sale_id', saleId).eq('void', false).order('created_at', { ascending: true })
  const lines: SaleLine[] = ((items || []) as any[]).map((it) => ({
    id: it.id, product_id: it.product_id, name: it.name, unit_price: Number(it.unit_price), qty: it.qty,
    tax_rate: Number(it.tax_rate), modifiers: Array.isArray(it.modifiers) ? it.modifiers : [], line_total: Number(it.line_total),
  }))
  return {
    id: s.id, status: s.status, table_label: s.table_label, server_label: s.server_label,
    subtotal: Number(s.subtotal), discount_kind: s.discount_kind, discount_value: Number(s.discount_value),
    discount_total: Number(s.discount_total), tax_total: Number(s.tax_total), total: Number(s.total),
    created_at: s.created_at, items: lines,
  }
}

/** Open tickets for the branch (parked sales bar). */
export async function listOpenSales(businessId: string, branchId: string | null): Promise<{ id: string; table_label: string | null; total: number; created_at: string }[]> {
  const sb: any = await createServiceRoleClient()
  let q = sb.from('pos_sales')
    .select('id, table_label, total, created_at')
    .eq('business_id', businessId).eq('status', 'open')
    .order('created_at', { ascending: false }).limit(50)
  if (branchId) q = q.eq('branch_id', branchId)
  const { data } = await q
  return ((data || []) as any[]).map((s) => ({ id: s.id, table_label: s.table_label, total: Number(s.total), created_at: s.created_at }))
}

/** Verify a staff PIN; returns staff identity + role on success. */
export async function verifyStaffPin(businessId: string, branchId: string | null, pin: string): Promise<{ ok: boolean; staffId?: string; label?: string; role?: string; branchId?: string | null }> {
  const sb: any = await createServiceRoleClient()
  const { data, error } = await sb.rpc('pos_verify_staff_pin', { p_business: businessId, p_branch: branchId, p_pin: pin })
  if (error) { console.error('pos_verify_staff_pin:', error.message); return { ok: false } }
  return (data as any) || { ok: false }
}

/** Create a staff member (PIN hashed in Postgres). */
export async function createStaff(businessId: string, branchId: string | null, label: string, pin: string, role: string): Promise<{ ok: boolean; error?: string; id?: string }> {
  const sb: any = await createServiceRoleClient()
  const { data, error } = await sb.rpc('pos_create_staff', { p_business: businessId, p_branch: branchId, p_label: label, p_pin: pin, p_role: role })
  if (error) { console.error('pos_create_staff:', error.message); return { ok: false, error: 'server' } }
  return (data as any) || { ok: false, error: 'server' }
}

export interface PosStaffRow {
  id: string
  label: string
  role: string
  branch_id: string | null
  created_at: string
  last_login_at: string | null
}

/** Active POS staff for a business (PIN hash never selected). */
export async function listStaff(businessId: string): Promise<PosStaffRow[]> {
  const sb: any = await createServiceRoleClient()
  const { data } = await sb
    .from('pos_staff')
    .select('id, label, role, branch_id, created_at, last_login_at')
    .eq('business_id', businessId).eq('active', true)
    .order('created_at', { ascending: false })
  return (data || []) as PosStaffRow[]
}

/** Deactivate (soft-delete) a POS staff member, scoped to the business (anti-IDOR). */
export async function deactivateStaff(businessId: string, id: string): Promise<boolean> {
  const sb: any = await createServiceRoleClient()
  const { error } = await sb.from('pos_staff').update({ active: false }).eq('id', id).eq('business_id', businessId)
  if (error) console.error('deactivateStaff:', error.message)
  return !error
}
