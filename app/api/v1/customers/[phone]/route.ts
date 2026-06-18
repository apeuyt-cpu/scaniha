/**
 * GET /api/v1/customers/[phone] — balance + recent history + active codes.
 *
 * Scope: loyalty:read. Reads via customerSummary(businessId, phone). An unknown
 * phone returns balance 0 with empty arrays (NOT a 404) — matches customerSummary.
 *
 * `phone` is decodeURIComponent'd then normPhone'd; null → validation_error (400).
 * Per-request order (spec §5): authenticateBearer → checkRateLimit → work.
 */
import { authenticateBearer } from '@/lib/api/keys'
import { apiOk, apiError } from '@/lib/api/respond'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { customerSummary, normPhone } from '@/lib/db/loyalty'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
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
    const { phone: phoneParam } = await params
    const phone = normPhone(decodeURIComponent(phoneParam))
    if (!phone) {
      return apiError('validation_error', 'Numéro de téléphone invalide.', 400)
    }
    // businessId from the authenticated key — the only id ever passed to the RPC.
    const summary = await customerSummary(auth.key.businessId, phone)
    return apiOk({ phone, ...summary })
  } catch (e: any) {
    console.error('v1/customers/[phone]:', e?.message)
    return apiError('server_error', 'Service momentanément indisponible.', 500)
  }
}
