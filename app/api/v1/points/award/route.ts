/**
 * POST /api/v1/points/award — credit a purchase (+ welcome bonus on first entry).
 *
 * Scope: loyalty:write. Body: { phone, amount, note? }. amount = TND spent;
 * points = round(amount * pointsPerTnd) (computed inside the RPC). The ROUTE
 * computes the human-readable note default — the RPC's own fallback is only the
 * bare string 'Achat' — matching the caisse route exactly.
 *
 * Per-request order (spec §5): authenticateBearer → checkRateLimit →
 * requireScope(loyalty:write) → work.
 */
import { authenticateBearer, requireScope } from '@/lib/api/keys'
import { apiOk, apiError, rpcErrorToResponse } from '@/lib/api/respond'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { awardPoints, normPhone } from '@/lib/db/loyalty'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Same always-on cap as the caisse (#3): a single award can't exceed a sane
// per-transaction maximum, so a key can't mint absurd point balances.
const MAX_AWARD_TND = 5000

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

    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return apiError('validation_error', 'Montant invalide.', 400)
    }
    if (amount > MAX_AWARD_TND) {
      return apiError('validation_error', `Montant trop élevé (max ${MAX_AWARD_TND} TND par opération).`, 400)
    }

    const note =
      typeof body.note === 'string' && body.note.trim()
        ? body.note.trim().slice(0, 120)
        : `Achat de ${amount} TND`

    // businessId from the authenticated key — the only id passed to the RPC.
    const result = await awardPoints(auth.key.businessId, phone, amount, note)
    if (!result.ok) {
      return rpcErrorToResponse(result.error)
    }

    return apiOk({
      phone,
      pointsAdded: result.pointsAdded,
      welcomeAdded: result.welcomeAdded,
      balance: result.balance,
    })
  } catch (e: any) {
    console.error('v1/points/award:', e?.message)
    return apiError('server_error', 'Service momentanément indisponible.', 500)
  }
}
