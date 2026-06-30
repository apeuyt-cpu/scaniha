import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto'
import { resolve4, resolve6, resolveMx } from 'dns/promises'
import { createServiceRoleClient } from '@/lib/supabase/server'

const CODE_COOKIE = 'scaniha_pr_code'
const RESET_COOKIE = 'scaniha_pr_reset'
const CODE_TTL_MS = 10 * 60 * 1000
const RESET_TTL_MS = 15 * 60 * 1000
const RESEND_AFTER_MS = 60 * 1000
const MIN_PASSWORD_LENGTH = 8

type CodePayload = {
  purpose: 'password-reset-code'
  email: string
  userId: string
  codeHash: string
  expiresAt: number
  sendAfter: number
}

type ResetPayload = {
  purpose: 'password-reset-token'
  email: string
  userId: string
  nonce: string
  expiresAt: number
}

export const passwordResetCookies = {
  code: CODE_COOKIE,
  reset: RESET_COOKIE,
}

const TYPO_SUGGESTIONS: Record<string, string> = {
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'hotnail.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outlook.con': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
}

function secret() {
  return process.env.PASSWORD_RESET_SECRET || process.env.SIGNUP_CODE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-password-reset-secret'
}

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url')
}

function signPayload(payload: object) {
  const body = base64url(JSON.stringify(payload))
  const sig = createHmac('sha256', secret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

function readPayload<T>(token: string | undefined, purpose: string): T | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null

  const expected = createHmac('sha256', secret()).update(body).digest()
  const actual = Buffer.from(sig, 'base64url')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (payload?.purpose !== purpose || typeof payload.expiresAt !== 'number' || payload.expiresAt < Date.now()) return null
    return payload as T
  } catch {
    return null
  }
}

function hashCode(email: string, code: string) {
  return createHash('sha256').update(`${email}:${code}:${secret()}`).digest('hex')
}

export function cleanEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export async function validateRealEmail(email: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!email) return { ok: false, message: 'Veuillez saisir votre adresse email.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Votre email est incorrect.' }
  }

  const domain = email.split('@')[1]
  if (!domain || domain.length > 253 || domain.includes('..') || /^\d+\.\d+\.\d+\.\d+$/.test(domain)) {
    return { ok: false, message: 'Votre email est incorrect.' }
  }

  const suggestion = TYPO_SUGGESTIONS[domain]
  if (suggestion) {
    return { ok: false, message: `Votre email semble incorrect. Voulez-vous dire @${suggestion} ?` }
  }

  const labels = domain.split('.')
  if (labels.some((label) => !label || label.length > 63 || label.startsWith('-') || label.endsWith('-'))) {
    return { ok: false, message: 'Votre email est incorrect.' }
  }

  try {
    const mx = await resolveMx(domain)
    if (mx.length > 0) return { ok: true }
  } catch {
    // Some valid domains accept mail on A/AAAA records without MX.
  }

  try {
    const [a, aaaa] = await Promise.allSettled([resolve4(domain), resolve6(domain)])
    if ((a.status === 'fulfilled' && a.value.length > 0) || (aaaa.status === 'fulfilled' && aaaa.value.length > 0)) {
      return { ok: true }
    }
  } catch {
    return { ok: false, message: 'Votre email est incorrect.' }
  }

  return { ok: false, message: 'Votre email est incorrect.' }
}

export async function findUserByEmail(email: string): Promise<{ userId: string; email: string } | null> {
  const admin: any = await createServiceRoleClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('user_id, email')
    .eq('email', email)
    .maybeSingle()

  if (profile?.user_id) return { userId: profile.user_id, email: profile.email || email }

  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const user = data?.users?.find((u: any) => String(u.email || '').toLowerCase() === email)
    if (user?.id) return { userId: user.id, email: user.email || email }
    if (!data?.users || data.users.length < 1000) break
  }

  return null
}

export function createCodeCookie(email: string, userId: string) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const payload: CodePayload = {
    purpose: 'password-reset-code',
    email,
    userId,
    codeHash: hashCode(email, code),
    expiresAt: Date.now() + CODE_TTL_MS,
    sendAfter: Date.now() + RESEND_AFTER_MS,
  }
  return { code, token: signPayload(payload), retryAfter: Math.ceil(RESEND_AFTER_MS / 1000) }
}

export function readCodeCookie(token: string | undefined) {
  return readPayload<CodePayload>(token, 'password-reset-code')
}

export function verifyCode(payload: CodePayload, code: string) {
  return /^\d{6}$/.test(code) && payload.codeHash === hashCode(payload.email, code)
}

export function createResetCookie(email: string, userId: string) {
  const payload: ResetPayload = {
    purpose: 'password-reset-token',
    email,
    userId,
    nonce: randomBytes(16).toString('hex'),
    expiresAt: Date.now() + RESET_TTL_MS,
  }
  return signPayload(payload)
}

export function readResetCookie(token: string | undefined) {
  return readPayload<ResetPayload>(token, 'password-reset-token')
}

export function validatePassword(password: string, confirmPassword: string) {
  if (!password) return 'Veuillez saisir votre nouveau mot de passe.'
  if (password.length < MIN_PASSWORD_LENGTH) return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`
  if (password !== confirmPassword) return 'Les deux mots de passe ne correspondent pas.'
  return null
}

