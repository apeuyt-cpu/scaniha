/**
 * Developer Platform — API Client Service
 * CRUD for developer clients (B2B tenants).
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { writeAuditLog, AuditAction } from './audit'
import type { ApiClient, PlatformStats } from './types'
import type { CreateApiClientInput, UpdateApiClientInput } from './validation'

// ─────────────────────────────────────────────────────────────────────────────
// List clients (paginated + search)
// ─────────────────────────────────────────────────────────────────────────────

export async function listApiClients(opts: {
  page?: number
  per_page?: number
  search?: string
  status?: string
  sort?: string
  order?: 'asc' | 'desc'
}): Promise<{ clients: ApiClient[]; total: number }> {
  const admin  = await createServiceRoleClient()
  const page   = opts.page ?? 1
  const limit  = opts.per_page ?? 20
  const offset = (page - 1) * limit
  const order  = opts.order ?? 'desc'
  const sortBy = opts.sort ?? 'created_at'

  let query = (admin.from('dev_clients') as any)
    .select(`
      *,
      dev_client_subscriptions(
        id, status, billing_cycle, expires_at, started_at,
        dev_api_plans(id, name, slug, plan_type, price_monthly, badge, badge_color)
      )
    `, { count: 'exact' })
    .order(sortBy, { ascending: order === 'asc' })
    .range(offset, offset + limit - 1)

  if (opts.status) query = query.eq('status', opts.status)
  if (opts.search) {
    query = query.or(
      `company_name.ilike.%${opts.search}%,email.ilike.%${opts.search}%`
    )
  }

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  // Flatten subscription join
  const clients = (data ?? []).map((c: any) => ({
    ...c,
    subscription: c.dev_client_subscriptions?.[0]
      ? { ...c.dev_client_subscriptions[0], plan: c.dev_client_subscriptions[0]?.dev_api_plans }
      : undefined,
  })) as ApiClient[]

  return { clients, total: count ?? 0 }
}

// ─────────────────────────────────────────────────────────────────────────────
// Get a single client with full relations
// ─────────────────────────────────────────────────────────────────────────────

export async function getApiClient(clientId: string): Promise<ApiClient | null> {
  const admin = await createServiceRoleClient()

  const { data, error } = await (admin.from('dev_clients') as any)
    .select(`
      *,
      dev_client_subscriptions(
        *,
        dev_api_plans(*)
      ),
      dev_api_keys(id, name, key_type, key_prefix, status, environment, last_used_at, created_at),
      dev_webhooks(id, url, status, event_types, total_deliveries, failed_deliveries)
    `)
    .eq('id', clientId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return {
    ...data,
    subscription: data.dev_client_subscriptions?.[0]
      ? { ...data.dev_client_subscriptions[0], plan: data.dev_client_subscriptions[0]?.dev_api_plans }
      : undefined,
    api_keys: data.dev_api_keys ?? [],
  } as ApiClient
}

// ─────────────────────────────────────────────────────────────────────────────
// Create a client (+ subscription if plan provided)
// ─────────────────────────────────────────────────────────────────────────────

export async function createApiClient(
  input: CreateApiClientInput,
  actorId: string
): Promise<ApiClient> {
  const admin = await createServiceRoleClient()

  const { plan_id, billing_cycle, ...clientData } = input

  // Filter out any undefined properties so Supabase PostgREST relies on default values
  const cleanData = Object.fromEntries(
    Object.entries(clientData).filter(([_, v]) => v !== undefined)
  )

  const { data, error } = await (admin.from('dev_clients') as any)
    .insert(cleanData)
    .select()
    .single()

  if (error) {
    console.error('[DEV_CLIENT_CREATE_ERROR]', error)
    if (error.code === '23505' || error.message?.includes('unique constraint')) {
      throw new Error(`A client with the email "${input.email}" already exists.`)
    }
    throw new Error(`Failed to create client: ${error.message || error.hint || 'Database insert error'}`)
  }

  // Create subscription if plan specified
  if (plan_id) {
    await (admin.from('dev_client_subscriptions') as any).insert({
      client_id:     data.id,
      plan_id,
      billing_cycle: billing_cycle ?? 'monthly',
      status:        'active',
      started_at:    new Date().toISOString(),
    })
  }

  await writeAuditLog({
    actor_id:     actorId,
    actor_type:   'super_admin',
    action:       AuditAction.CLIENT_CREATED,
    resource_type: 'client',
    resource_id:  data.id,
    new_value:    { company_name: data.company_name, email: data.email },
  })

  return data as ApiClient
}

// ─────────────────────────────────────────────────────────────────────────────
// Update a client
// ─────────────────────────────────────────────────────────────────────────────

export async function updateApiClient(
  clientId: string,
  input: UpdateApiClientInput,
  actorId: string
): Promise<ApiClient> {
  const admin = await createServiceRoleClient()

  const { plan_id, billing_cycle, ...updateData } = input

  const { data, error } = await (admin.from('dev_clients') as any)
    .update(updateData)
    .eq('id', clientId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update client: ${error.message}`)

  await writeAuditLog({
    actor_id:     actorId,
    actor_type:   'super_admin',
    action:       AuditAction.CLIENT_UPDATED,
    resource_type: 'client',
    resource_id:  clientId,
    new_value:    updateData as Record<string, unknown>,
  })

  return data as ApiClient
}

// ─────────────────────────────────────────────────────────────────────────────
// Suspend a client
// ─────────────────────────────────────────────────────────────────────────────

export async function suspendApiClient(
  clientId: string,
  reason: string,
  actorId: string
): Promise<void> {
  const admin = await createServiceRoleClient()

  await (admin.from('dev_clients') as any).update({
    status:           'suspended',
    suspended_at:     new Date().toISOString(),
    suspension_reason: reason,
  }).eq('id', clientId)

  // Revoke all active keys for suspended client
  await (admin.from('dev_api_keys') as any).update({
    status:            'revoked',
    revoked_at:        new Date().toISOString(),
    revoked_by:        actorId,
    revocation_reason: `Client suspended: ${reason}`,
  }).eq('client_id', clientId).eq('status', 'active')

  await writeAuditLog({
    actor_id:     actorId,
    actor_type:   'super_admin',
    action:       AuditAction.CLIENT_SUSPENDED,
    resource_type: 'client',
    resource_id:  clientId,
    new_value:    { reason },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Reactivate a client
// ─────────────────────────────────────────────────────────────────────────────

export async function reactivateApiClient(
  clientId: string,
  actorId: string
): Promise<void> {
  const admin = await createServiceRoleClient()

  await (admin.from('dev_clients') as any).update({
    status:           'active',
    suspended_at:     null,
    suspension_reason: null,
  }).eq('id', clientId)

  await writeAuditLog({
    actor_id:     actorId,
    actor_type:   'super_admin',
    action:       AuditAction.CLIENT_REACTIVATED,
    resource_type: 'client',
    resource_id:  clientId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform-wide stats
// ─────────────────────────────────────────────────────────────────────────────

export async function getPlatformStats(): Promise<PlatformStats> {
  const admin = await createServiceRoleClient()

  const [
    { count: total_clients },
    { count: active_clients },
    { count: total_api_keys },
    { count: active_api_keys },
    { count: active_subscriptions },
    { count: webhooks_total },
  ] = await Promise.all([
    (admin.from('dev_clients') as any).select('id', { count: 'exact', head: true }),
    (admin.from('dev_clients') as any).select('id', { count: 'exact', head: true }).eq('status', 'active'),
    (admin.from('dev_api_keys') as any).select('id', { count: 'exact', head: true }),
    (admin.from('dev_api_keys') as any).select('id', { count: 'exact', head: true }).eq('status', 'active'),
    (admin.from('dev_client_subscriptions') as any).select('id', { count: 'exact', head: true }).eq('status', 'active'),
    (admin.from('dev_webhooks') as any).select('id', { count: 'exact', head: true }),
  ])

  // Usage for today
  const today = new Date().toISOString().split('T')[0]
  const { data: todayUsage } = await (admin.from('dev_usage_daily') as any)
    .select('total_requests, error_requests, avg_response_ms')
    .eq('day', today)

  const totalToday = (todayUsage ?? []).reduce((s: number, r: any) => s + (r.total_requests ?? 0), 0)
  const errorsToday = (todayUsage ?? []).reduce((s: number, r: any) => s + (r.error_requests ?? 0), 0)
  const avgMs = todayUsage?.length
    ? Math.round((todayUsage as any[]).reduce((s, r) => s + (r.avg_response_ms ?? 0), 0) / todayUsage.length)
    : 0

  // Revenue this month
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const { data: invoices } = await (admin.from('dev_invoices') as any)
    .select('total')
    .eq('status', 'paid')
    .gte('paid_at', monthStart.toISOString())

  const revenueMonth = (invoices ?? []).reduce((s: number, i: any) => s + (i.total ?? 0), 0)

  return {
    total_clients:        total_clients ?? 0,
    active_clients:       active_clients ?? 0,
    total_api_keys:       total_api_keys ?? 0,
    active_api_keys:      active_api_keys ?? 0,
    total_requests_today: totalToday,
    total_requests_month: 0,   // Can be computed with monthly rollup
    avg_response_ms:      avgMs,
    error_rate_percent:   totalToday > 0 ? Math.round((errorsToday / totalToday) * 100) : 0,
    revenue_month:        revenueMonth,
    active_subscriptions: active_subscriptions ?? 0,
    webhooks_total:       webhooks_total ?? 0,
    rate_limit_hits_today: 0,
  }
}
