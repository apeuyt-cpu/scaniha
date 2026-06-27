// Data access for the café onboarding queue (business_requests).
// Writes/reads go through the service-role client; CALLERS MUST gate the request
// (public form route validates + rate-limits; super-admin routes/pages call
// requireSuperAdmin first). The table is RLS service-role-only by design.

import { createServiceRoleClient } from '@/lib/supabase/server'

export type BusinessRequestStatus = 'new' | 'contacted' | 'approved' | 'converted' | 'rejected'

export interface BusinessRequest {
  id: string
  created_at: string
  updated_at: string
  status: BusinessRequestStatus
  business_name: string
  contact_name: string
  phone: string
  email: string | null
  city: string | null
  product: string
  plan: string | null
  message: string | null
  source: string
  business_id: string | null
  notes: string | null
  handled_by: string | null
}

export interface NewBusinessRequest {
  business_name: string
  contact_name: string
  phone: string
  email?: string | null
  city?: string | null
  product?: string
  plan?: string | null
  message?: string | null
  source?: string
}

/** Insert a public lead. Returns the created row id. */
export async function createBusinessRequest(input: NewBusinessRequest): Promise<string> {
  const svc: any = await createServiceRoleClient()
  const row = {
    business_name: input.business_name,
    contact_name: input.contact_name,
    phone: input.phone,
    email: input.email || null,
    city: input.city || null,
    product: input.product || 'menu',
    plan: input.plan || null,
    message: input.message || null,
    source: input.source || 'website',
    status: 'new',
  }
  const { data, error } = await svc.from('business_requests').insert(row).select('id').single()
  if (error) throw new Error(error.message)
  return data.id as string
}

/** Full queue, newest first (super-admin only — gate before calling). */
export async function listBusinessRequests(): Promise<BusinessRequest[]> {
  const svc: any = await createServiceRoleClient()
  const { data, error } = await svc
    .from('business_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []) as BusinessRequest[]
}

export async function getBusinessRequest(id: string): Promise<BusinessRequest | null> {
  const svc: any = await createServiceRoleClient()
  const { data, error } = await svc.from('business_requests').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return (data || null) as BusinessRequest | null
}

/** Patch status/notes (and, on conversion, the linked business_id + handler). */
export async function updateBusinessRequest(
  id: string,
  patch: Partial<Pick<BusinessRequest, 'status' | 'notes' | 'business_id' | 'handled_by'>>,
): Promise<void> {
  const svc: any = await createServiceRoleClient()
  const { error } = await svc.from('business_requests').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

/** Count of unhandled leads for the nav badge. */
export async function countNewBusinessRequests(): Promise<number> {
  const svc: any = await createServiceRoleClient()
  const { count, error } = await svc
    .from('business_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'new')
  if (error) return 0
  return count || 0
}
