/**
 * Developer Platform — API Plans Service
 * Plan creation, editing, feature matrix management.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { writeAuditLog, AuditAction } from './audit'
import { ALL_FEATURES } from './types'
import type { ApiPlan, PlanFeature } from './types'
import type { CreateApiPlanInput, UpdateApiPlanInput } from './validation'

// ─────────────────────────────────────────────────────────────────────────────
// List all plans
// ─────────────────────────────────────────────────────────────────────────────

export async function listApiPlans(includeHidden = true): Promise<ApiPlan[]> {
  const admin = await createServiceRoleClient()

  let query = (admin.from('dev_api_plans') as any)
    .select('*, dev_plan_features(*)')
    .order('sort_order', { ascending: true })

  if (!includeHidden) query = query.eq('is_public', true)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []).map((p: any) => ({
    ...p,
    features: p.dev_plan_features ?? [],
  })) as ApiPlan[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Get a single plan
// ─────────────────────────────────────────────────────────────────────────────

export async function getApiPlan(planId: string): Promise<ApiPlan | null> {
  const admin = await createServiceRoleClient()

  const { data, error } = await (admin.from('dev_api_plans') as any)
    .select('*, dev_plan_features(*)')
    .eq('id', planId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return { ...data, features: data.dev_plan_features ?? [] } as ApiPlan
}

// ─────────────────────────────────────────────────────────────────────────────
// Create a plan
// ─────────────────────────────────────────────────────────────────────────────

export async function createApiPlan(
  input: CreateApiPlanInput,
  actorId: string
): Promise<ApiPlan> {
  const admin = await createServiceRoleClient()

  const { features, ...planData } = input

  const { data, error } = await (admin.from('dev_api_plans') as any)
    .insert(planData)
    .select()
    .single()

  if (error) throw new Error(`Failed to create plan: ${error.message}`)

  // Insert feature permissions if provided
  if (features && Object.keys(features).length > 0) {
    const featureRows = Object.entries(features).map(([feature, perms]) => ({
      plan_id: data.id,
      feature,
      ...perms,
    }))
    await (admin.from('dev_plan_features') as any).insert(featureRows)
  } else {
    // Seed default features: all features with read-only access
    const defaults = ALL_FEATURES.map(feature => ({
      plan_id:    data.id,
      feature,
      can_create: false,
      can_read:   true,
      can_update: false,
      can_delete: false,
      can_export: false,
      can_import: false,
      can_search: true,
      can_bulk:   false,
    }))
    await (admin.from('dev_plan_features') as any).insert(defaults)
  }

  await writeAuditLog({
    actor_id:     actorId,
    actor_type:   'super_admin',
    action:       AuditAction.PLAN_CREATED,
    resource_type: 'plan',
    resource_id:  data.id,
    new_value:    { name: data.name, slug: data.slug, plan_type: data.plan_type },
  })

  return getApiPlan(data.id) as Promise<ApiPlan>
}

// ─────────────────────────────────────────────────────────────────────────────
// Update a plan
// ─────────────────────────────────────────────────────────────────────────────

export async function updateApiPlan(
  planId: string,
  input: UpdateApiPlanInput,
  actorId: string
): Promise<ApiPlan> {
  const admin = await createServiceRoleClient()

  const { features, ...planData } = input

  const { data, error } = await (admin.from('dev_api_plans') as any)
    .update(planData)
    .eq('id', planId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update plan: ${error.message}`)

  // Update feature matrix if provided
  if (features) {
    for (const [feature, perms] of Object.entries(features)) {
      await (admin.from('dev_plan_features') as any)
        .upsert({ plan_id: planId, feature, ...perms }, { onConflict: 'plan_id,feature' })
    }
  }

  await writeAuditLog({
    actor_id:     actorId,
    actor_type:   'super_admin',
    action:       AuditAction.PLAN_UPDATED,
    resource_type: 'plan',
    resource_id:  planId,
    new_value:    planData as Record<string, unknown>,
  })

  return getApiPlan(planId) as Promise<ApiPlan>
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete a plan (only if no active subscriptions)
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteApiPlan(planId: string, actorId: string): Promise<void> {
  const admin = await createServiceRoleClient()

  // Guard: check for active subscriptions
  const { count } = await (admin.from('dev_client_subscriptions') as any)
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', planId)
    .eq('status', 'active')

  if ((count ?? 0) > 0) {
    throw new Error(`Cannot delete plan: ${count} active subscriptions depend on it.`)
  }

  const { error } = await (admin.from('dev_api_plans') as any).delete().eq('id', planId)
  if (error) throw new Error(`Failed to delete plan: ${error.message}`)

  await writeAuditLog({
    actor_id:     actorId,
    actor_type:   'super_admin',
    action:       AuditAction.PLAN_DELETED,
    resource_type: 'plan',
    resource_id:  planId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Update feature permissions for a plan
// ─────────────────────────────────────────────────────────────────────────────

export async function updatePlanFeatures(
  planId: string,
  permissions: Array<{ feature: string } & Record<string, boolean>>,
  actorId: string
): Promise<PlanFeature[]> {
  const admin = await createServiceRoleClient()

  const rows = permissions.map(p => ({ plan_id: planId, ...p }))

  const { data, error } = await (admin.from('dev_plan_features') as any)
    .upsert(rows, { onConflict: 'plan_id,feature' })
    .select()

  if (error) throw new Error(`Failed to update features: ${error.message}`)

  await writeAuditLog({
    actor_id:     actorId,
    actor_type:   'super_admin',
    action:       AuditAction.PERMISSIONS_UPDATED,
    resource_type: 'plan',
    resource_id:  planId,
  })

  return (data ?? []) as PlanFeature[]
}
