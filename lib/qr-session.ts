/**
 * QR scan-session crypto. The café's QR carries a per-business secret (qrKey).
 * Opening the menu with the matching `?s=<qrKey>` mints a signed, httpOnly
 * cookie that proves "scanned this café's CURRENT QR at time T". Spinning
 * requires a valid, non-expired cookie → diners must (re)scan on-site.
 *
 * The signature binds the cookie to (businessId, qrKey, issuedAt) using an
 * app-server secret, so it can't be forged. Because qrKey is part of the HMAC
 * key, rotating qrKey in admin instantly invalidates every outstanding cookie.
 * Server-only — never import into client components.
 */
import crypto from 'crypto'

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-insecure-qr-secret'
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789' // no 0/O/1/I/l

/** Per-business cookie name — café A's scan never unlocks café B. */
export function scanCookieName(businessId: string): string {
  return `qrs_${businessId}`
}

/** A fresh random key to embed in the QR (URL-safe, unambiguous, ~107 bits). */
export function newQrKey(): string {
  const bytes = crypto.randomBytes(20)
  let out = ''
  for (let i = 0; i < bytes.length; i++) out += ALPHABET[bytes[i] % ALPHABET.length]
  return out
}

function sign(businessId: string, qrKey: string, issuedAt: number): string {
  return crypto
    .createHmac('sha256', `${SECRET}:${qrKey}`)
    .update(`${businessId}.${issuedAt}`)
    .digest('base64url')
}

/** Mint a cookie value tying a scan to (business, current key, now). */
export function signScan(businessId: string, qrKey: string, issuedAt: number): string {
  return `${issuedAt}.${sign(businessId, qrKey, issuedAt)}`
}

/** True when `value` is authentic for the CURRENT qrKey and within ttlMin. */
export function verifyScan(
  value: string | undefined,
  businessId: string,
  qrKey: string,
  ttlMin: number
): boolean {
  if (!value || !qrKey) return false
  const dot = value.indexOf('.')
  if (dot === -1) return false
  const issuedAt = Number(value.slice(0, dot))
  const sig = value.slice(dot + 1)
  if (!Number.isFinite(issuedAt) || !sig) return false
  const expected = sign(businessId, qrKey, issuedAt)
  if (sig.length !== expected.length) return false
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false
  const ageMin = (Date.now() - issuedAt) / 60000
  return ageMin >= 0 && ageMin <= ttlMin
}
