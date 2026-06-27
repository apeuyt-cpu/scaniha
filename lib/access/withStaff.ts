import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getActiveBusiness } from '@/lib/db/business'
import { getActiveStaff, type ActiveStaff } from '@/lib/access/staff-context'
import { can, type Capability } from '@/lib/access/permissions'

type Biz = { id: string; name: string; [k: string]: any }
type Handler = (req: Request, ctx: { business: Biz; staff: ActiveStaff; params?: any }) => Promise<Response> | Response

/**
 * Server-authoritative route guard. Wrap an /api/admin route handler so it runs
 * only when the active staff member HAS the capability. When PINs are off (or the
 * actor is the owner / a super-admin impersonating), the staff is owner-level so
 * every capability passes → no behaviour change. The handler receives the
 * resolved business + staff (use staff.staffId for attribution).
 */
/**
 * Inline capability guard for multi-action routes (where wrapping the whole
 * export is too coarse). Call after requireOwner()+getActiveBusiness():
 *   const g = await requireCap('page.comptoir'); if ('res' in g) return g.res
 *   const staff = g.staff   // use staff.staffId for attribution
 * Returns owner-level staff (pass) when PIN is off / owner / impersonating.
 */
export async function requireCap(capability: Capability): Promise<{ staff: ActiveStaff } | { res: NextResponse }> {
  const staff = await getActiveStaff()
  if (!staff) return { res: NextResponse.json({ error: 'Code PIN requis.' }, { status: 401 }) }
  if (!can(staff.capabilities, capability)) return { res: NextResponse.json({ error: "Vous n'avez pas accès à cette action." }, { status: 403 }) }
  return { staff }
}

export function withStaff(capability: Capability, handler: Handler) {
  return async (req: Request, ctx?: { params?: any }) => {
    try {
      await requireOwner()
      const business = (await getActiveBusiness()) as Biz | null
      if (!business) return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
      const staff = await getActiveStaff()
      if (!staff) return NextResponse.json({ error: 'Code PIN requis.' }, { status: 401 })
      if (!can(staff.capabilities, capability)) {
        return NextResponse.json({ error: "Vous n'avez pas accès à cette action." }, { status: 403 })
      }
      return await handler(req, { business, staff, params: ctx?.params })
    } catch (e: any) {
      if (e?.digest?.startsWith?.('NEXT_REDIRECT') || e?.message === 'NEXT_REDIRECT') throw e
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }
  }
}
