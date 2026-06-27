/**
 * POST /api/v1/codes/validate — validate a win OR reward code.
 *
 * Scope: loyalty:write (consuming a code is a mutation). Body: { code, redeem? }.
 * `redeem` defaults FALSE for the API (peek-by-default is safer for integrators;
 * opt in to consuming). Returns the ValidateResult directly.
 *
 * Nullability (spec §5.6): customerPhone is string | null (a win may be spun
 * without a phone); pointsCost only present for kind:'reward'; redeemedAt only
 * present for status:'already'; expiresAt only present for status:'valid'.
 * Cross-business safety: validate_code(p_business, ...) only matches the key's
 * business, so a code from another café returns { found: false }.
 *
 * Per-request order (spec §5): authenticateBearer → checkRateLimit →
 * requireScope(loyalty:write) → work.
 */
import { authenticateBearer, requireScope } from '@/lib/api/keys'
import { apiOk, apiError } from '@/lib/api/respond'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { validateCode } from '@/lib/db/loyalty'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await authenticateBearer(request)
  if (!auth.ok) return apiError(auth.code, auth.message, auth.status)

  const rl = checkRateLimit(auth.key.keyId)
  if (!rl.ok) {
    const res = apiError('rate_limited', 'Trop de requêtes. Réessayez bientôt.', 429)
    res.headers.set('Retry-After', String(rl.retryAfter))
    return res
  }

  const scopeErr = requireScope(auth.key, 'loyalty:write')
  if (scopeErr) return apiError(scopeErr.code, scopeErr.message, scopeErr.status)

  try {
    const body = await request.json().catch(() => ({}))

    const code = String(body.code ?? '').trim()
    if (code.length < 4) {
      return apiError('validation_error', 'Code invalide.', 400)
    }

    // redeem defaults FALSE (peek) for the API; opt in by sending redeem:true.
    const result = await validateCode(auth.key.businessId, code, body.redeem === true)
    return apiOk(result)
  } catch (e: any) {
    console.error('v1/codes/validate:', e?.message)
    return apiError('server_error', 'Service momentanément indisponible.', 500)
  }
}
