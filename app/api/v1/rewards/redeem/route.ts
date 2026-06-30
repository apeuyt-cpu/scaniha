/**
 * POST /api/v1/rewards/redeem — debit points and issue a redeemable reward code.
 *
 * Scope: loyalty:write. Body: { phone, reward_id }. Uses redeemReward(slug, ...)
 * — the redeem_reward RPC keys by SLUG. We pass auth.key.slug, which the auth
 * helper resolved from the SAME businesses row as businessId, so it can only be
 * this business's slug (the IDOR guard for the slug-keyed RPC, spec REVIEW
 * DECISION A). insufficient → insufficient_points (409) with error.missing.
 *
 * Per-request order (spec §5): authenticateBearer → checkRateLimit →
 * requireScope(loyalty:write) → work.
 */
import { authenticateBearer, requireScope } from '@/lib/api/keys'
import { apiOk, apiError, rpcErrorToResponse } from '@/lib/api/respond'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { redeemReward, normPhone } from '@/lib/db/loyalty'

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

    const phone = normPhone(body.phone)
    if (!phone) {
      return apiError('validation_error', 'Numéro de téléphone invalide.', 400)
    }

    const rewardId = typeof body.reward_id === 'string' ? body.reward_id.trim() : ''
    if (!rewardId) {
      return apiError('validation_error', 'Identifiant de récompense invalide.', 400)
    }

    // slug from the authenticated key (same row as businessId) — IDOR-safe.
    const result = await redeemReward(auth.key.slug, phone, rewardId)
    if (!result.ok) {
      return rpcErrorToResponse(result.error, result.missing)
    }

    return apiOk({
      code: result.code,
      rewardLabel: result.rewardLabel,
      expiresAt: result.expiresAt,
      balance: result.balance,
    })
  } catch (e: any) {
    console.error('v1/rewards/redeem:', e?.message)
    return apiError('server_error', 'Service momentanément indisponible.', 500)
  }
}
