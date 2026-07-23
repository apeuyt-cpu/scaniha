/**
 * Developer Platform — API Key Service
 * Key generation, authentication, rotation, and revocation.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateApiKey, generateWebhookSecret, sha256Hex, verifyKey } from './crypto'
import { writeAuditLog, AuditAction } from './audit'
import type { ApiKey, ApiKeyType, ApiKeyEnvironment, ApiClient } from './types'
import type { CreateApiKeyInput } from './validation'

// ─────────────────────────────────────────────────────────────────────────────
// Create a new API key
// ─────────────────────────────────────────────────────────────────────────────

export async function createApiKey(
  input: CreateApiKeyInput,
  actorId: string
): Promise<{ key: ApiKey; rawKey: string }> {
  const admin = await createServiceRoleClient()

  const { rawKey, prefix, hash } = generateApiKey(input.key_type as ApiKeyType)

  const { data, error } = await (admin.from('dev_api_keys') as any).insert({
    client_id:           input.client_id,
    name:                input.name,
    key_type:            input.key_type,
    environment:         input.environment,
    key_prefix:          prefix,
    key_hash:            hash,
    scopes:              input.scopes ?? [],
    allowed_ips:         input.allowed_ips ?? [],
    allowed_origins:     input.allowed_origins ?? [],
    allowed_domains:     input.allowed_domains ?? [],
    allowed_user_agents: input.allowed_user_agents ?? [],
    allowed_environments: input.allowed_environments ?? [],
    expires_at:          input.expires_at ?? null,
    status:              'active',
  }).select().single()

  if (error) throw new Error(`Failed to create API key: ${error.message}`)

  await writeAuditLog({
    actor_id:     actorId,
    actor_type:   'super_admin',
    action:       AuditAction.KEY_CREATED,
    resource_type: 'api_key',
    resource_id:  data.id,
    new_value:    { client_id: input.client_id, key_type: input.key_type, name: input.name },
  })

  return { key: data as ApiKey, rawKey }
}

// ─────────────────────────────────────────────────────────────────────────────
// Authenticate a raw API key → returns client_id + key record if valid
// ─────────────────────────────────────────────────────────────────────────────

export async function authenticateApiKey(
  rawKey: string,
  context?: { clientIp?: string; origin?: string }
): Promise<{
  valid: boolean
  key?: ApiKey
  client?: ApiClient
  clientId?: string
  error?: string
}> {
  if (!rawKey || rawKey.length < 20) return { valid: false, error: 'Invalid key format' }

  try {
    const admin = await createServiceRoleClient()
    const hash = sha256Hex(rawKey)

    const { data: key, error } = await (admin.from('dev_api_keys') as any)
      .select('*, dev_clients(*)')
      .eq('key_hash', hash)
      .eq('status', 'active')
      .maybeSingle()

    if (error || !key) return { valid: false, error: 'Invalid or revoked API key' }

    const client = key.dev_clients
    if (client && client.status === 'suspended') {
      return { valid: false, error: 'API client account is suspended' }
    }

    // Check expiry
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return { valid: false, error: 'API key has expired' }
    }

    // Update last_used_at (fire-and-forget, don't await)
    ;(admin.from('dev_api_keys') as any).update({ last_used_at: new Date().toISOString() }).eq('id', key.id)

    return { valid: true, key: key as ApiKey, client: client as ApiClient, clientId: key.client_id }
  } catch (err) {
    console.error('[API_KEY_AUTH]', err)
    return { valid: false, error: 'Authentication service error' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Revoke an API key
// ─────────────────────────────────────────────────────────────────────────────

export async function revokeApiKey(
  keyId: string,
  actorId: string,
  reason?: string
): Promise<void> {
  const admin = await createServiceRoleClient()

  const { error } = await (admin.from('dev_api_keys') as any).update({
    status:            'revoked',
    revoked_at:        new Date().toISOString(),
    revoked_by:        actorId,
    revocation_reason: reason ?? null,
  }).eq('id', keyId)

  if (error) throw new Error(`Failed to revoke key: ${error.message}`)

  await writeAuditLog({
    actor_id:     actorId,
    actor_type:   'super_admin',
    action:       AuditAction.KEY_REVOKED,
    resource_type: 'api_key',
    resource_id:  keyId,
    new_value:    { reason },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Rotate an API key (mark old as 'rotating', create new, return new)
// ─────────────────────────────────────────────────────────────────────────────

export async function rotateApiKey(
  oldKeyId: string,
  actorId: string
): Promise<{ key: ApiKey; rawKey: string }> {
  const admin = await createServiceRoleClient()

  // Fetch old key
  const { data: oldKey, error: fetchErr } = await (admin.from('dev_api_keys') as any)
    .select('*')
    .eq('id', oldKeyId)
    .single()

  if (fetchErr || !oldKey) throw new Error('Key not found')

  // Create new key with same config
  const { rawKey, prefix, hash } = generateApiKey(oldKey.key_type)

  const { data: newKey, error: createErr } = await (admin.from('dev_api_keys') as any).insert({
    client_id:           oldKey.client_id,
    name:                oldKey.name + ' (rotated)',
    key_type:            oldKey.key_type,
    environment:         oldKey.environment,
    key_prefix:          prefix,
    key_hash:            hash,
    scopes:              oldKey.scopes,
    allowed_ips:         oldKey.allowed_ips,
    allowed_origins:     oldKey.allowed_origins,
    allowed_domains:     oldKey.allowed_domains,
    allowed_user_agents: oldKey.allowed_user_agents,
    allowed_environments: oldKey.allowed_environments,
    expires_at:          oldKey.expires_at,
    status:              'active',
  }).select().single()

  if (createErr) throw new Error(`Failed to create replacement key: ${createErr.message}`)

  // Mark old key as rotating, link to new
  await (admin.from('dev_api_keys') as any).update({
    status:        'rotating',
    rolling_key_id: newKey.id,
    revoked_at:    new Date().toISOString(),
    revoked_by:    actorId,
    revocation_reason: 'Key rotation',
  }).eq('id', oldKeyId)

  await writeAuditLog({
    actor_id:     actorId,
    actor_type:   'super_admin',
    action:       AuditAction.KEY_ROTATED,
    resource_type: 'api_key',
    resource_id:  oldKeyId,
    new_value:    { new_key_id: newKey.id },
  })

  return { key: newKey as ApiKey, rawKey }
}

// ─────────────────────────────────────────────────────────────────────────────
// List keys for a client
// ─────────────────────────────────────────────────────────────────────────────

export async function listClientApiKeys(clientId: string): Promise<ApiKey[]> {
  const admin = await createServiceRoleClient()
  const { data, error } = await (admin.from('dev_api_keys') as any)
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as ApiKey[]
}

// ─────────────────────────────────────────────────────────────────────────────
// List all keys (platform-wide, paginated)
// ─────────────────────────────────────────────────────────────────────────────

export async function listAllApiKeys(opts: {
  page?: number
  per_page?: number
  search?: string
  status?: string
}): Promise<{ keys: ApiKey[]; total: number }> {
  const admin  = await createServiceRoleClient()
  const page   = opts.page ?? 1
  const limit  = opts.per_page ?? 20
  const offset = (page - 1) * limit

  let query = (admin.from('dev_api_keys') as any)
    .select('*, dev_clients(company_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts.status) query = query.eq('status', opts.status)
  if (opts.search) query = query.ilike('name', `%${opts.search}%`)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)
  return { keys: (data ?? []) as ApiKey[], total: count ?? 0 }
}
