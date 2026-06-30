/**
 * Shared v1 public-API response helpers — the SINGLE source for the frozen
 * error envelope and the `Scaniha-API-Version` header. Every /api/v1/* route
 * builds its responses through `apiOk` / `apiError` so the version header is
 * present on EVERY response, errors included.
 *
 * Error envelope (FROZEN):
 *   { "error": { "code": "snake_case_code", "message": "Message en français.", ...details } }
 */
import { NextResponse } from 'next/server'

export const API_VERSION = '1'

/** Success response. Always sets Scaniha-API-Version: 1. */
export function apiOk(data: unknown, init?: { status?: number }) {
  return NextResponse.json(data, {
    status: init?.status ?? 200,
    headers: { 'Scaniha-API-Version': API_VERSION },
  })
}

/**
 * Error response in the frozen envelope. `details` (when given) is merged INTO
 * the `error` object (e.g. `{ code, message, missing }`). Always sets
 * Scaniha-API-Version: 1.
 */
export function apiError(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    { error: { code, message, ...(details ?? {}) } },
    { status, headers: { 'Scaniha-API-Version': API_VERSION } }
  )
}

/** 405 in the v1 envelope, for routes that want to answer unhandled verbs. */
export function methodNotAllowed() {
  return apiError('method_not_allowed', 'Méthode non autorisée.', 405)
}

/**
 * Map an internal RPC / wrapper error string (from awardPoints / redeemReward /
 * etc. in lib/db/loyalty.ts) to the frozen v1 envelope. Raw RPC strings are
 * NEVER leaked — anything unrecognized collapses to a generic 500.
 *   - no_program | setup → program_inactive (409)
 *   - no_reward          → not_found (404)
 *   - insufficient       → insufficient_points (409) with error.missing
 *   - bad_amount         → validation_error (400)
 *   - everything else    → server_error (500)
 */
export function rpcErrorToResponse(err: string | undefined, missing?: number) {
  switch (err) {
    case 'no_program':
    case 'setup':
      return apiError('program_inactive', 'Le programme de fidélité est inactif.', 409)
    case 'no_reward':
      return apiError('not_found', 'Récompense introuvable.', 404)
    case 'insufficient':
      return apiError('insufficient_points', 'Solde de points insuffisant.', 409, {
        missing: missing ?? null,
      })
    case 'bad_amount':
      return apiError('validation_error', 'Montant invalide.', 400)
    default:
      return apiError('server_error', 'Service momentanément indisponible.', 500)
  }
}
