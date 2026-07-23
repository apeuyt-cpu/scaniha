/**
 * Developer Platform — Rate Limiter Service
 * PostgreSQL-based sliding window rate limiter.
 * Upgradeable to Redis by swapping the check function.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { RateLimitResult } from './types'

export type WindowType = 'second' | 'minute' | 'hour' | 'day' | 'month'

const WINDOW_TTL: Record<WindowType, string> = {
  second: '2 seconds',
  minute: '2 minutes',
  hour:   '2 hours',
  day:    '2 days',
  month:  '2 months',
}

const WINDOW_MS: Record<WindowType, number> = {
  second: 1_000,
  minute: 60_000,
  hour:   3_600_000,
  day:    86_400_000,
  month:  2_592_000_000,
}

/**
 * Compute a stable window key for the given window type.
 * e.g. minute → "2026-07-22T16:05" (truncated to minute)
 */
function windowKey(type: WindowType, now = new Date()): string {
  const iso = now.toISOString()
  switch (type) {
    case 'second': return iso.slice(0, 19)      // 2026-07-22T16:05:30
    case 'minute': return iso.slice(0, 16)      // 2026-07-22T16:05
    case 'hour':   return iso.slice(0, 13)      // 2026-07-22T16
    case 'day':    return iso.slice(0, 10)      // 2026-07-22
    case 'month':  return iso.slice(0, 7)       // 2026-07
  }
}

/**
 * Check a single rate limit window. Returns result.
 * Uses the PostgreSQL function dev_check_rate_limit for atomic increment.
 */
async function checkWindow(
  clientId: string,
  type: WindowType,
  limit: number
): Promise<RateLimitResult> {
  if (limit === -1) {
    return { allowed: true, limit: -1, remaining: -1, reset_at: '', window_type: type }
  }

  const admin   = await createServiceRoleClient()
  const now     = new Date()
  const key     = windowKey(type, now)
  const resetAt = new Date(now.getTime() + WINDOW_MS[type]).toISOString()

  try {
    const { data, error } = await (admin.rpc as any)('dev_check_rate_limit', {
      p_client_id:   clientId,
      p_window_type: type,
      p_window_key:  key,
      p_limit:       limit,
      p_window_ttl:  WINDOW_TTL[type],
    })

    if (error) throw error

    const row = data?.[0] ?? { allowed: true, curr_count: 0, limit_val: limit, remaining: limit }
    return {
      allowed:     row.allowed,
      limit:       row.limit_val,
      remaining:   row.remaining,
      reset_at:    resetAt,
      window_type: type,
    }
  } catch (err) {
    console.error('[RATE_LIMITER] DB error — failing open:', err)
    // On DB error, fail open (allow the request) to avoid blocking on infra issues
    return { allowed: true, limit, remaining: limit, reset_at: resetAt, window_type: type }
  }
}

export interface RateLimitConfig {
  per_minute?: number
  per_hour?:   number
  per_day?:    number
  per_month?:  number
}

export interface RateLimitCheckResult {
  allowed:   boolean
  headers:   Record<string, string>
  exceeded?: RateLimitResult
}

/**
 * Check all relevant rate limit windows for a client.
 * Returns allowed=false + the first exceeded window if any limit is hit.
 * Also returns headers suitable for attaching to the HTTP response.
 */
export async function checkRateLimits(
  clientId: string,
  config: RateLimitConfig
): Promise<RateLimitCheckResult> {
  const checks = await Promise.all([
    config.per_minute !== undefined ? checkWindow(clientId, 'minute', config.per_minute) : null,
    config.per_hour   !== undefined ? checkWindow(clientId, 'hour',   config.per_hour)   : null,
    config.per_day    !== undefined ? checkWindow(clientId, 'day',    config.per_day)    : null,
    config.per_month  !== undefined ? checkWindow(clientId, 'month',  config.per_month)  : null,
  ])

  const results = checks.filter(Boolean) as RateLimitResult[]
  const exceeded = results.find(r => !r.allowed)

  // The most restrictive remaining window
  const tightest = results.filter(r => r.limit !== -1).sort((a, b) => a.remaining - b.remaining)[0]

  const headers: Record<string, string> = {}
  if (tightest) {
    headers['X-RateLimit-Limit']     = String(tightest.limit)
    headers['X-RateLimit-Remaining'] = String(Math.max(0, tightest.remaining))
    headers['X-RateLimit-Reset']     = tightest.reset_at
    headers['X-RateLimit-Window']    = tightest.window_type
  }

  if (exceeded) {
    headers['Retry-After'] = String(Math.ceil((new Date(exceeded.reset_at).getTime() - Date.now()) / 1000))
    return { allowed: false, headers, exceeded }
  }

  return { allowed: true, headers }
}

/**
 * Purge expired rate limit windows (call via cron / cleanup job).
 */
export async function purgeExpiredWindows(): Promise<void> {
  try {
    const admin = await createServiceRoleClient()
    await (admin.rpc as any)('dev_cleanup_rate_limits')
  } catch (err) {
    console.error('[RATE_LIMITER] Cleanup failed:', err)
  }
}
