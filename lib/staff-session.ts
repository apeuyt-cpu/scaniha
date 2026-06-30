/**
 * Staff PIN session crypto. After the café's single account logs in, an employee
 * picks their name and enters their PIN; on success we mint a signed, httpOnly
 * cookie proving "staff X is at this terminal until T". The cookie carries ONLY
 * the identity (staffId) — never the role/permissions, which are re-read from the
 * DB on every request so a revocation by the owner is instant.
 *
 * Mirrors lib/qr-session.ts exactly (HMAC, timing-safe, TTL). Server-only.
 * `staffId` is a uuid, or the sentinel 'owner' for the account-owner bypass.
 */
import crypto from 'crypto'

function resolveSecret(): string {
  const dedicated = process.env.STAFF_SESSION_SECRET
  if (dedicated) return dedicated
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceKey) return serviceKey
  throw new Error('Staff session secret missing: set STAFF_SESSION_SECRET (or SUPABASE_SERVICE_ROLE_KEY).')
}
const SECRET = resolveSecret()

/** TTL in minutes — one service day; a fresh PIN is required after. */
export const STAFF_SESSION_TTL_MIN = 720

/** Per-business cookie name (café A's session never unlocks café B). */
export function staffCookieName(businessId: string): string {
  return `stf_${businessId}`
}

function sign(businessId: string, staffId: string, issuedAt: number): string {
  return crypto.createHmac('sha256', `${SECRET}:staff`).update(`${businessId}.${staffId}.${issuedAt}`).digest('base64url')
}

/** Mint a cookie value tying a staff identity to (business, now). */
export function signStaffSession(businessId: string, staffId: string, issuedAt: number): string {
  return `${issuedAt}.${staffId}.${sign(businessId, staffId, issuedAt)}`
}

/** Returns the authentic, non-expired staffId for this business, else null. */
export function verifyStaffSession(value: string | undefined, businessId: string, ttlMin: number): string | null {
  if (!value) return null
  const i1 = value.indexOf('.')
  if (i1 === -1) return null
  const i2 = value.indexOf('.', i1 + 1)
  if (i2 === -1) return null
  const issuedAt = Number(value.slice(0, i1))
  const staffId = value.slice(i1 + 1, i2)
  const sig = value.slice(i2 + 1)
  if (!Number.isFinite(issuedAt) || !staffId || !sig) return null
  const expected = sign(businessId, staffId, issuedAt)
  if (sig.length !== expected.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  const ageMin = (Date.now() - issuedAt) / 60000
  if (ageMin < 0 || ageMin > ttlMin) return null
  return staffId
}
