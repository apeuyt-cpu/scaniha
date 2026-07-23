/**
 * Developer Platform — Cryptographic utilities
 * Key generation, hashing, and encoding. Server-side only.
 */

import { createHash, randomBytes } from 'crypto'

// ─────────────────────────────────────────────────────────────────────────────
// Key prefixes for different key types
// ─────────────────────────────────────────────────────────────────────────────

const KEY_PREFIXES = {
  public:     'pk_live_',
  secret:     'sk_live_',
  sandbox:    'sk_test_',
  production: 'sk_prod_',
  temporary:  'sk_tmp_',
} as const

const WEBHOOK_SECRET_PREFIX = 'whsec_'
const OAUTH_SECRET_PREFIX   = 'oas_'

// ─────────────────────────────────────────────────────────────────────────────
// Raw key format: prefix + 40 random hex chars
// Total: ~52 chars, cryptographically secure
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a new API key.
 * Returns { rawKey, prefix, hash }.
 * rawKey is shown once to the user and NEVER stored.
 * Only prefix and hash are persisted.
 */
export function generateApiKey(type: keyof typeof KEY_PREFIXES = 'secret'): {
  rawKey: string
  prefix: string
  hash: string
} {
  const prefix = KEY_PREFIXES[type]
  const secret = randomBytes(32).toString('hex') // 64 hex chars
  const rawKey = prefix + secret
  const hash   = sha256Hex(rawKey)
  // prefix shown in UI = first 16 chars of rawKey (safe prefix + partial secret)
  const displayPrefix = rawKey.slice(0, prefix.length + 8) + '…'

  return { rawKey, prefix: displayPrefix, hash }
}

/**
 * Generate a webhook signing secret.
 * Returns { rawSecret, prefix, hash }.
 */
export function generateWebhookSecret(): {
  rawSecret: string
  prefix: string
  hash: string
} {
  const body     = randomBytes(32).toString('hex')
  const rawSecret = WEBHOOK_SECRET_PREFIX + body
  const hash     = sha256Hex(rawSecret)
  const prefix   = rawSecret.slice(0, 12) + '…'
  return { rawSecret, prefix, hash }
}

/**
 * Generate OAuth client credentials.
 * Returns { clientId, rawSecret, secretHash }.
 */
export function generateOAuthCredentials(): {
  clientId: string
  rawSecret: string
  secretHash: string
} {
  const clientId  = 'oauth_' + randomBytes(12).toString('hex')
  const rawSecret = OAUTH_SECRET_PREFIX + randomBytes(32).toString('hex')
  const secretHash = sha256Hex(rawSecret)
  return { clientId, rawSecret, secretHash }
}

/**
 * SHA-256 hex digest of a string.
 */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex')
}

/**
 * Verify a raw key against its stored hash.
 */
export function verifyKey(rawKey: string, storedHash: string): boolean {
  const hash = sha256Hex(rawKey)
  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'))
}

/**
 * Constant-time buffer comparison (prevents timing attacks on key validation).
 */
function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i]
  }
  return result === 0
}

/**
 * Generate a cryptographically random token for OAuth authorization codes.
 */
export function generateAuthCode(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Generate PKCE code verifier (RFC 7636).
 */
export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Compute PKCE code challenge from verifier (S256 method).
 */
export function computeCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

/**
 * Generate a webhook HMAC-SHA256 signature for payload verification.
 * Clients verify: HMAC-SHA256(secret, `${timestamp}.${payload}`)
 */
export function signWebhookPayload(secret: string, timestamp: number, payload: string): string {
  const { createHmac } = require('crypto')
  const signed = `${timestamp}.${payload}`
  return 'v1=' + createHmac('sha256', secret).update(signed).digest('hex')
}

export function generateWebhookSignature(payload: string, secret: string, timestamp: number): string {
  return signWebhookPayload(secret, timestamp, payload)
}

/**
 * Mask a raw API key for display — shows prefix + last 4, masks middle.
 * e.g. "sk_live_a1b2c3d4…efgh" → "sk_live_a1b2…efgh"
 */
export function maskKey(rawKey: string): string {
  if (rawKey.length <= 12) return '***'
  const last4 = rawKey.slice(-4)
  const prefix = rawKey.slice(0, Math.min(12, rawKey.length - 4))
  return `${prefix}…${last4}`
}

/**
 * Generate a short readable ID for invoice numbers etc.
 */
export function generateShortId(prefix = ''): string {
  return prefix + randomBytes(4).toString('hex').toUpperCase()
}
