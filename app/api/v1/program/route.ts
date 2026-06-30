/**
 * GET /api/v1/program — public loyalty program config for the key's business.
 *
 * Scope: loyalty:read. Reads via loadLoyalty(slug) (no phone). A program that is
 * off is NOT an error — it returns 200 with { active: false } (a config read).
 *
 * Per-request order (spec §5): authenticateBearer → checkRateLimit → work.
 * business_id/slug come ONLY from the authenticated key (the IDOR guard).
 */
import { authenticateBearer } from '@/lib/api/keys'
import { apiOk, apiError } from '@/lib/api/respond'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { loadLoyalty } from '@/lib/db/loyalty'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // 1. Authenticate (also enforces revoked-key / inactive-business + loyalty:read membership later).
  const auth = await authenticateBearer(request)
  if (!auth.ok) return apiError(auth.code, auth.message, auth.status)

  // 2. Fair-use rate limit.
  const rl = checkRateLimit(auth.key.keyId)
  if (!rl.ok) {
    const res = apiError('rate_limited', 'Trop de requêtes. Réessayez bientôt.', 429)
    res.headers.set('Retry-After', String(rl.retryAfter))
    return res
  }

  // 3. Read scope.
  if (!auth.key.scopes.includes('loyalty:read')) {
    return apiError('insufficient_scope', 'Cette clé API ne permet pas cette action.', 403)
  }

  try {
    const config = await loadLoyalty(auth.key.slug)
    return apiOk({
      active: config.active,
      businessName: config.businessName,
      pointsPerTnd: config.pointsPerTnd,
      rewardsCount: (config.rewards || []).length,
    })
  } catch (e: any) {
    console.error('v1/program:', e?.message)
    return apiError('server_error', 'Service momentanément indisponible.', 500)
  }
}
