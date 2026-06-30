/**
 * GET /api/v1/rewards — active rewards catalog for the key's business.
 *
 * Scope: loyalty:read. Reads via loadLoyalty(slug). If the program is off →
 * program_inactive (409) (unlike /program, which reports config and stays 200).
 *
 * Per-request order (spec §5): authenticateBearer → checkRateLimit → work.
 */
import { authenticateBearer } from '@/lib/api/keys'
import { apiOk, apiError } from '@/lib/api/respond'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { loadLoyalty } from '@/lib/db/loyalty'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await authenticateBearer(request)
  if (!auth.ok) return apiError(auth.code, auth.message, auth.status)

  const rl = checkRateLimit(auth.key.keyId)
  if (!rl.ok) {
    const res = apiError('rate_limited', 'Trop de requêtes. Réessayez bientôt.', 429)
    res.headers.set('Retry-After', String(rl.retryAfter))
    return res
  }

  if (!auth.key.scopes.includes('loyalty:read')) {
    return apiError('insufficient_scope', 'Cette clé API ne permet pas cette action.', 403)
  }

  try {
    const config = await loadLoyalty(auth.key.slug)
    if (!config.active) {
      return apiError('program_inactive', 'Le programme de fidélité est inactif.', 409)
    }
    return apiOk({ rewards: config.rewards })
  } catch (e: any) {
    console.error('v1/rewards:', e?.message)
    return apiError('server_error', 'Service momentanément indisponible.', 500)
  }
}
