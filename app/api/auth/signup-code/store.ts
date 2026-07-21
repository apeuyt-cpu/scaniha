import { createHash, randomInt } from 'crypto'

type CodeRecord = {
  hash: string
  expiresAt: number
  sendAfter: number
  attempts: number
}

const TTL_MS = 10 * 60 * 1000
const RESEND_AFTER_MS = 5 * 1000 // Reduced from 60s to 5s for easier testing
const MAX_ATTEMPTS = 6

const globalStore = globalThis as typeof globalThis & {
  __scanihaSignupCodes?: Map<string, CodeRecord>
}

const store = globalStore.__scanihaSignupCodes ?? new Map<string, CodeRecord>()
globalStore.__scanihaSignupCodes = store

export function cleanEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function hashCode(email: string, code: string) {
  const secret = process.env.SIGNUP_CODE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-signup-code-secret'
  return createHash('sha256').update(`${email}:${code}:${secret}`).digest('hex')
}

export function issueSignupCode(email: string) {
  const now = Date.now()
  const existing = store.get(email)
  if (existing && existing.sendAfter > now) {
    return { ok: false as const, retryAfter: Math.ceil((existing.sendAfter - now) / 1000) }
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  store.set(email, {
    hash: hashCode(email, code),
    expiresAt: now + TTL_MS,
    sendAfter: now + RESEND_AFTER_MS,
    attempts: 0,
  })

  return { ok: true as const, code, retryAfter: Math.ceil(RESEND_AFTER_MS / 1000) }
}

export function verifySignupCode(email: string, code: string) {
  const record = store.get(email)
  if (!record) return { ok: false as const, error: 'Code introuvable. Envoyez un nouveau code.' }

  if (record.expiresAt < Date.now()) {
    store.delete(email)
    return { ok: false as const, error: 'Ce code a expiré. Envoyez un nouveau code.' }
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    store.delete(email)
    return { ok: false as const, error: 'Trop de tentatives. Envoyez un nouveau code.' }
  }

  record.attempts += 1
  if (!/^\d{6}$/.test(code) || hashCode(email, code) !== record.hash) {
    return { ok: false as const, error: 'Code de vérification incorrect.' }
  }

  return { ok: true as const }
}

