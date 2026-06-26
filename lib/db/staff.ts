import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Capability } from '@/lib/access/permissions'

// Unified staff data layer (app_staff). All access via service-role / SECURITY
// DEFINER RPCs — the table has no public RLS policies. Mirrors lib/db/staff-pins
// + lib/db/pos staff helpers, with the fail-open/fail-closed asymmetry preserved.

export interface StaffRow {
  id: string
  label: string
  role: 'cashier' | 'server' | 'manager' | 'owner'
  branch_id: string | null
  permissions: { allow?: Capability[]; deny?: Capability[] }
  active: boolean
  created_at: string
  last_login_at: string | null
  locked_until: string | null
}

export interface StaffIdentity {
  ok: boolean
  staffId?: string
  label?: string
  role?: StaffRow['role']
  branchId?: string | null
  error?: string
  lockedUntil?: string
}

/** Verify a staff PIN (the lock screen already picked WHO → per-staff lockout). */
export async function verifyStaffPin(businessId: string, staffId: string, pin: string): Promise<StaffIdentity> {
  const sb: any = await createServiceRoleClient()
  const { data, error } = await sb.rpc('staff_verify_pin', { p_business: businessId, p_staff: staffId, p_pin: pin })
  if (error) { console.error('staff_verify_pin:', error.message); return { ok: false, error: 'server' } } // fail-CLOSED
  return (data as any) || { ok: false, error: 'server' }
}

/** Active staff for the lock screen / management (never returns pin_hash). */
export async function listStaff(businessId: string): Promise<StaffRow[]> {
  const sb: any = await createServiceRoleClient()
  const { data } = await sb
    .from('app_staff')
    .select('id, label, role, branch_id, permissions, active, created_at, last_login_at, locked_until')
    .eq('business_id', businessId).eq('active', true)
    .order('created_at', { ascending: false })
  return (data || []) as StaffRow[]
}

/** Minimal list for the lock screen (id + label + role only). */
export async function listStaffForLock(businessId: string): Promise<{ id: string; label: string; role: string }[]> {
  const sb: any = await createServiceRoleClient()
  const { data } = await sb.from('app_staff').select('id, label, role').eq('business_id', businessId).eq('active', true).order('label')
  return (data || []) as { id: string; label: string; role: string }[]
}

export async function getStaffById(businessId: string, id: string): Promise<StaffRow | null> {
  const sb: any = await createServiceRoleClient()
  const { data } = await sb
    .from('app_staff')
    .select('id, label, role, branch_id, permissions, active, created_at, last_login_at, locked_until')
    .eq('business_id', businessId).eq('id', id).maybeSingle()
  return (data as StaffRow) || null
}

/**
 * Whether the business has ANY active staff. FAIL-OPEN: on error return false so
 * a broken RPC never locks an owner out of a café that has no staff configured.
 */
export async function businessHasStaff(businessId: string): Promise<boolean> {
  try {
    const sb: any = await createServiceRoleClient()
    const { count } = await sb.from('app_staff').select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('active', true)
    return (count || 0) > 0
  } catch { return false }
}

export async function createStaff(businessId: string, branchId: string | null, label: string, pin: string, role: string): Promise<{ ok: boolean; error?: string; id?: string }> {
  const sb: any = await createServiceRoleClient()
  const { data, error } = await sb.rpc('staff_create', { p_business: businessId, p_branch: branchId, p_label: label, p_pin: pin, p_role: role })
  if (error) { console.error('staff_create:', error.message); return { ok: false, error: 'server' } }
  return (data as any) || { ok: false, error: 'server' }
}

export async function deactivateStaff(businessId: string, id: string): Promise<boolean> {
  const sb: any = await createServiceRoleClient()
  const { error } = await sb.from('app_staff').update({ active: false }).eq('id', id).eq('business_id', businessId)
  if (error) console.error('deactivateStaff:', error.message)
  return !error
}

export async function resetLockout(businessId: string, id: string): Promise<boolean> {
  const sb: any = await createServiceRoleClient()
  const { error } = await sb.rpc('staff_reset_lockout', { p_business: businessId, p_staff: id })
  return !error
}

/** Append-only audit insert (call from inside money/sensitive flows). */
export async function logStaffAction(p: {
  businessId: string; branchId?: string | null; actorStaff?: string | null; actorLabel?: string | null
  action: string; targetTable?: string | null; targetId?: string | null; amount?: number | null; detail?: string | null
}): Promise<void> {
  try {
    const sb: any = await createServiceRoleClient()
    await sb.rpc('log_staff_action', {
      p_business: p.businessId, p_branch: p.branchId ?? null, p_actor: p.actorStaff ?? null, p_actor_label: p.actorLabel ?? null,
      p_action: p.action, p_target_table: p.targetTable ?? null, p_target_id: p.targetId ?? null, p_amount: p.amount ?? null, p_detail: p.detail ?? null,
    })
  } catch (e: any) { console.error('logStaffAction:', e?.message) }
}

/** Owner-scoped audit feed for the Personnel › Activité tab. */
export async function listStaffAudit(businessId: string, limit = 100): Promise<any[]> {
  const sb: any = await createServiceRoleClient()
  const { data } = await sb
    .from('staff_audit')
    .select('id, actor_staff, actor_label, action, target_table, target_id, amount, detail, created_at')
    .eq('business_id', businessId).order('created_at', { ascending: false }).limit(limit)
  return (data || []) as any[]
}
