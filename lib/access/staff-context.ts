import { cache } from 'react'
import { cookies } from 'next/headers'
import { getActiveBusiness } from '@/lib/db/business'
import { getImpersonatedBusinessId } from '@/lib/admin-impersonation'
import { getStaffById, businessHasStaff } from '@/lib/db/staff'
import { verifyStaffSession, staffCookieName, STAFF_SESSION_TTL_MIN } from '@/lib/staff-session'
import { isStaffPinEnabled, resolveCapabilities, ALL_CAPS, type Capability, type StaffRole } from '@/lib/access/permissions'

export interface ActiveStaff {
  staffId: string | null   // null = owner / owner-bypass
  role: StaffRole
  label: string
  capabilities: Capability[]
}

const OWNER: ActiveStaff = { staffId: null, role: 'owner', label: 'Propriétaire', capabilities: ALL_CAPS }

/**
 * The staff member acting in the current request, with their effective
 * capabilities. SAFE BY DESIGN — returns full owner access (no behaviour change)
 * when: PIN is off, the café has no staff, or a super-admin is impersonating.
 * Returns null only when PINs are required + staff exist + no valid unlock (the
 * layout gate already forces the lock screen in that case; routes deny).
 * Memoised per request.
 */
export const getActiveStaff = cache(async (): Promise<ActiveStaff | null> => {
  const business = await getActiveBusiness()
  if (!business) return null

  // super-admin "Gérer comme" → full access, never PIN-gated.
  try { if (await getImpersonatedBusinessId()) return OWNER } catch { /* not impersonating */ }

  // opt-in off, or no staff configured → full owner access (current behaviour).
  if (!isStaffPinEnabled(business)) return OWNER
  if (!(await businessHasStaff(business.id))) return OWNER

  const cookie = (await cookies()).get(staffCookieName(business.id))?.value
  const sid = verifyStaffSession(cookie, business.id, STAFF_SESSION_TTL_MIN)
  if (!sid) return null                 // PIN required but not unlocked
  if (sid === 'owner') return OWNER

  const row = await getStaffById(business.id, sid)
  if (!row || !row.active) return null
  return {
    staffId: row.id,
    role: row.role,
    label: row.label,
    capabilities: resolveCapabilities(row.role, row.permissions),
  }
})
