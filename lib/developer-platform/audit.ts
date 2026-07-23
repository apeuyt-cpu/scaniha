/**
 * Developer Platform — Audit Log Service
 * Immutable append-only audit trail for all platform actions.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { AuditActorType } from './types'

export interface AuditEntry {
  actor_id?:     string
  actor_type:    AuditActorType
  action:        string           // e.g. "key.created", "client.suspended"
  resource_type: string           // e.g. "api_key", "client"
  resource_id?:  string
  old_value?:    Record<string, unknown>
  new_value?:    Record<string, unknown>
  ip_address?:   string
  user_agent?:   string
  metadata?:     Record<string, unknown>
}

/**
 * Append an audit log entry. Never throws — errors are silently swallowed
 * so a logging failure never breaks the primary operation.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const admin = await createServiceRoleClient()
    await (admin.from('dev_audit_logs') as any).insert({
      actor_id:     entry.actor_id ?? null,
      actor_type:   entry.actor_type,
      action:       entry.action,
      resource_type: entry.resource_type,
      resource_id:  entry.resource_id ?? null,
      old_value:    entry.old_value ?? null,
      new_value:    entry.new_value ?? null,
      ip_address:   entry.ip_address ?? null,
      user_agent:   entry.user_agent ?? null,
      metadata:     entry.metadata ?? {},
    })
  } catch (err) {
    // Audit failures must NEVER break the main operation
    console.error('[DEV_AUDIT] Failed to write audit log:', err)
  }
}

/**
 * Well-known audit actions (namespace: resource.verb).
 */
export const AuditAction = {
  // API Keys
  KEY_CREATED:   'key.created',
  KEY_REVOKED:   'key.revoked',
  KEY_ROTATED:   'key.rotated',
  KEY_EXPIRED:   'key.expired',
  // Clients
  CLIENT_CREATED:   'client.created',
  CLIENT_UPDATED:   'client.updated',
  CLIENT_SUSPENDED: 'client.suspended',
  CLIENT_REACTIVATED: 'client.reactivated',
  CLIENT_DELETED:   'client.deleted',
  // Plans
  PLAN_CREATED: 'plan.created',
  PLAN_UPDATED: 'plan.updated',
  PLAN_DELETED: 'plan.deleted',
  // Subscriptions
  SUBSCRIPTION_CREATED:   'subscription.created',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  SUBSCRIPTION_RENEWED:   'subscription.renewed',
  // OAuth
  OAUTH_CLIENT_CREATED: 'oauth_client.created',
  OAUTH_CLIENT_REVOKED: 'oauth_client.revoked',
  OAUTH_TOKEN_ISSUED:   'oauth_token.issued',
  OAUTH_TOKEN_REVOKED:  'oauth_token.revoked',
  // Webhooks
  WEBHOOK_CREATED:  'webhook.created',
  WEBHOOK_UPDATED:  'webhook.updated',
  WEBHOOK_DELETED:  'webhook.deleted',
  WEBHOOK_DISABLED: 'webhook.disabled',
  // Products
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',
  // Billing
  INVOICE_CREATED: 'invoice.created',
  INVOICE_PAID:    'invoice.paid',
  INVOICE_VOIDED:  'invoice.voided',
  // Permissions
  PERMISSIONS_UPDATED: 'permissions.updated',
  // Auth
  API_REQUEST: 'api.request',
  AUTH_FAILED:  'auth.failed',
} as const

export type AuditActionType = typeof AuditAction[keyof typeof AuditAction]
