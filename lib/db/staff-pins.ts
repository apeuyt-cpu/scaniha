/**
 * Staff PINs (caisse authorization) — data layer. Mirrors lib/api/keys.ts.
 *
 * staff_pins is service-role only (RLS + revokes); the raw PIN is hashed in
 * Postgres (create_staff_pin / verify_staff_pin RPCs) and NEVER persisted in
 * this layer — we never select or return pin_hash.
 *
 * Failure modes are deliberately asymmetric:
 *  - businessHasStaffPins fails OPEN (false) → if the migration isn't installed
 *    yet, the caisse keeps working without PINs (no lockout).
 *  - verifyStaffPin fails CLOSED (false) → a broken RPC can never bypass a PIN
 *    that the café HAS configured.
 *
 * The typed Supabase client is cast to `any` for these calls — same convention
 * as lib/db/loyalty.ts — and the single service-client `as any` lives here.
 */
import { createServiceRoleClient } from '@/lib/supabase/server'

/** Public (non-secret) view of a staff PIN — never includes pin_hash. */
export interface StaffPinPublic {
  id: string
  label: string
  active: boolean
  created_at: string
}

/** List a business's ACTIVE PINs (public fields only — never pin_hash). */
export async function listStaffPins(businessId: string): Promise<StaffPinPublic[]> {
  const supabase: any = await createServiceRoleClient()
  const { data, error } = await supabase
    .from('staff_pins')
    .select('id, label, active, created_at')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('listStaffPins:', error?.message)
    return []
  }
  return (data || []) as StaffPinPublic[]
}

/**
 * Create a PIN for a business. Hashing happens in Postgres. On success returns
 * the public row; on failure THROWS new Error(data.error) so the route can map
 * 'duplicate_label' / 'weak' / 'label' to the right HTTP status + message.
 */
export async function createStaffPin(
  businessId: string,
  label: string,
  pin: string
): Promise<StaffPinPublic> {
  const supabase: any = await createServiceRoleClient()
  const { data, error } = await supabase.rpc('create_staff_pin', {
    p_business: businessId,
    p_label: label,
    p_pin: pin,
  })
  if (error) {
    console.error('createStaffPin:', error?.message)
    throw new Error('create_failed')
  }
  if (!data?.ok) {
    throw new Error(data?.error || 'create_failed')
  }
  return { id: data.id, label: data.label, active: data.active, created_at: data.created_at }
}

/**
 * Deactivate a PIN. The `business_id` predicate is the IDOR guard (exactly like
 * revokeApiKey) — an owner can only deactivate their OWN active PINs. Returns
 * true when a still-active row was deactivated, false otherwise.
 */
export async function deactivateStaffPin(businessId: string, id: string): Promise<boolean> {
  const supabase: any = await createServiceRoleClient()
  const { data, error } = await supabase
    .from('staff_pins')
    .update({ active: false })
    .eq('id', id)
    .eq('business_id', businessId)
    .eq('active', true)
    .select('id')
  if (error) {
    console.error('deactivateStaffPin:', error?.message)
    return false
  }
  return Array.isArray(data) && data.length > 0
}

/**
 * Whether this business currently REQUIRES a staff PIN at the caisse.
 * Fails OPEN (false) on error / missing RPC so existing cafés keep working when
 * the migration hasn't run yet.
 */
export async function businessHasStaffPins(businessId: string): Promise<boolean> {
  const supabase: any = await createServiceRoleClient()
  const { data, error } = await supabase.rpc('business_has_staff_pins', { p_business: businessId })
  if (error) {
    console.error('businessHasStaffPins:', error?.message)
    return false
  }
  return data === true
}

/**
 * Verify a presented PIN against this business's active PINs (constant-work RPC).
 * Fails CLOSED (false) on error so a broken RPC can't bypass a configured PIN.
 */
export async function verifyStaffPin(businessId: string, pin: string): Promise<boolean> {
  const supabase: any = await createServiceRoleClient()
  const { data, error } = await supabase.rpc('verify_staff_pin', { p_business: businessId, p_pin: pin })
  if (error) {
    console.error('verifyStaffPin:', error?.message)
    return false
  }
  return data === true
}
