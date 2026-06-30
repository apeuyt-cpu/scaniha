/**
 * Best-effort, in-process fair-use limiter for the /api/v1/* public API.
 *
 * Constraint: Supabase free tier — no Redis, no per-request DB writes. So this
 * is a per-PROCESS sliding window keyed by the API key id. It throttles
 * accidental hammering (a misconfigured POS loop) WITHOUT new infra; it is NOT a
 * hard, cross-instance quota. State is ephemeral: it resets on cold start and is
 * not shared across serverless instances. This limitation is documented to
 * integrators ("usage équitable, best-effort"); a distributed limiter is a v1.1
 * upgrade (Postgres api_request_log + SECURITY DEFINER counter).
 *
 * Documented policy: 60 requests / minute and 5 000 requests / day per key.
 * Over the limit → callers return 429 `rate_limited` with a `Retry-After`
 * header (seconds).
 */

const PER_MINUTE_LIMIT = 60
const PER_DAY_LIMIT = 5000
const MINUTE_MS = 60_000
const DAY_MS = 86_400_000

/** Rolling timestamps (ms) of the last minute's requests, per key. */
const minuteHits = new Map<string, number[]>()
/** Per-key daily counter + the window start it belongs to. */
const dayHits = new Map<string, { count: number; windowStart: number }>()

/**
 * Optional per-call overrides. Defaults match the documented public-API policy
 * (60/min, 5 000/day) so existing single-arg callers are unchanged. Stricter
 * limits (e.g. diner login/signup) pass their own caps. Keys are namespaced by
 * the caller (e.g. `login-ip:…`, `signup-ip:…`) so the windows don't collide.
 */
export type RateLimitOpts = { perMinute?: number; perDay?: number }

export function checkRateLimit(
  keyId: string,
  opts?: RateLimitOpts
): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now()
  const perMinute = opts?.perMinute ?? PER_MINUTE_LIMIT
  const perDay = opts?.perDay ?? PER_DAY_LIMIT

  // ── Per-minute sliding window ──────────────────────────────────────────
  const recent = (minuteHits.get(keyId) || []).filter((t) => now - t < MINUTE_MS)
  if (recent.length >= perMinute) {
    minuteHits.set(keyId, recent)
    const oldest = recent[0]
    const retryAfter = Math.max(1, Math.ceil((MINUTE_MS - (now - oldest)) / 1000))
    return { ok: false, retryAfter }
  }

  // ── Per-day fixed window ───────────────────────────────────────────────
  const day = dayHits.get(keyId)
  if (!day || now - day.windowStart >= DAY_MS) {
    // Start (or roll) the daily window.
    dayHits.set(keyId, { count: 1, windowStart: now })
    recent.push(now)
    minuteHits.set(keyId, recent)
    return { ok: true }
  }
  if (day.count >= perDay) {
    const retryAfter = Math.max(1, Math.ceil((DAY_MS - (now - day.windowStart)) / 1000))
    return { ok: false, retryAfter }
  }

  // ── Allowed — record the hit in both windows ───────────────────────────
  day.count += 1
  recent.push(now)
  minuteHits.set(keyId, recent)
  return { ok: true }
}
