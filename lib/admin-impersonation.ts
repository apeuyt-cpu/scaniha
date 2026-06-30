import { cookies } from 'next/headers'

/**
 * Super-admin "Gérer comme l'établissement" (impersonation).
 *
 * A super-admin can act as a business and use the real owner admin for it. The
 * chosen business id lives in this httpOnly cookie. It is honoured ONLY when the
 * server-verified profile role is 'super_admin' (see getActiveBusiness /
 * requireOwner), so the cookie's integrity is not a security boundary — a
 * non-super-admin's forged cookie is simply ignored.
 */
export const IMPERSONATION_COOKIE = 'sa_business'

/** The business id the current super-admin is acting as, or null. */
export async function getImpersonatedBusinessId(): Promise<string | null> {
  try {
    const store = await cookies()
    const v = store.get(IMPERSONATION_COOKIE)?.value
    return v && typeof v === 'string' ? v : null
  } catch {
    return null
  }
}
