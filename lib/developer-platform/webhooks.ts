/**
 * Developer Platform — Webhook Delivery Engine
 * Real-time event dispatcher with HMAC SHA-256 signatures & retries.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateWebhookSignature } from './crypto'

export interface WebhookPayload {
  id: string
  event: string
  created_at: string
  data: Record<string, unknown>
}

/**
 * Dispatch a webhook event to all active webhooks registered for a client.
 * Does not block the caller — runs asynchronously in background.
 */
export async function dispatchWebhookEvent(
  clientId: string,
  eventType: string,
  eventData: Record<string, unknown>
): Promise<void> {
  try {
    const admin = await createServiceRoleClient()

    // 1. Find all active webhooks for this client subscribed to eventType (or '*')
    const { data: webhooks, error } = await (admin.from('dev_webhooks') as any)
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'active')

    if (error || !webhooks || webhooks.length === 0) return

    // Filter webhooks that subscribe to this event or '*'
    const matchingWebhooks = webhooks.filter((wh: any) => {
      const types: string[] = wh.event_types ?? []
      return types.includes('*') || types.includes(eventType)
    })

    if (matchingWebhooks.length === 0) return

    const eventId = 'evt_' + Math.random().toString(36).slice(2, 11)
    const timestamp = Math.floor(Date.now() / 1000)

    const payload: WebhookPayload = {
      id: eventId,
      event: eventType,
      created_at: new Date().toISOString(),
      data: eventData,
    }

    const payloadString = JSON.stringify(payload)

    // 2. Deliver to each matching webhook
    for (const webhook of matchingWebhooks) {
      deliverWebhook(webhook, payload, payloadString, timestamp).catch((err) => {
        console.error(`[WEBHOOK_DELIVERY_ERROR] ${webhook.url}:`, err)
      })
    }
  } catch (err) {
    console.error('[WEBHOOK_DISPATCH_ERROR]', err)
  }
}

async function deliverWebhook(
  webhook: any,
  payload: WebhookPayload,
  payloadString: string,
  timestamp: number
): Promise<void> {
  const admin = await createServiceRoleClient()
  const startTime = Date.now()

  // Generate HMAC-SHA256 signature if webhook secret exists
  const signature = webhook.secret
    ? generateWebhookSignature(payloadString, webhook.secret, timestamp)
    : undefined

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Scaniha-Webhook/1.0',
    'X-Scaniha-Event': payload.event,
    'X-Scaniha-Delivery': payload.id,
  }

  if (signature) {
    headers['X-Scaniha-Signature'] = signature
  }

  let status = 'failed'
  let statusCode = 0
  let responseText = ''

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

    const res = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    statusCode = res.status
    responseText = await res.text().catch(() => '')

    if (res.ok) {
      status = 'delivered'
    } else {
      status = 'failed'
    }
  } catch (err: any) {
    responseText = err.message ?? 'Network error'
  }

  const durationMs = Date.now() - startTime

  // Log delivery attempt in dev_webhook_events
  await (admin.from('dev_webhook_events') as any).insert({
    webhook_id: webhook.id,
    event_type: payload.event,
    payload,
    response_status: statusCode || null,
    response_body: responseText.slice(0, 2000),
    response_time_ms: durationMs,
    status,
    attempt_count: 1,
  })

  // Update webhook stats
  const failedInc = status === 'failed' ? 1 : 0
  await (admin.from('dev_webhooks') as any).update({
    total_deliveries: (webhook.total_deliveries ?? 0) + 1,
    failed_deliveries: (webhook.failed_deliveries ?? 0) + failedInc,
    last_delivery_at: new Date().toISOString(),
    status: (webhook.failed_deliveries ?? 0) + failedInc >= 10 ? 'failing' : webhook.status,
  }).eq('id', webhook.id)
}
