import { NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { getActiveBusiness } from '@/lib/db/business'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { isFidelityLive } from '@/lib/design-settings'

export const dynamic = 'force-dynamic'

/**
 * Owner-scoped fidelity activity for the Statistiques page: plays, lots/rewards
 * waiting to be handed over, purchases credited, and customer counts — all for
 * THIS café only. Counts only (no sums) to stay light on the free tier. Returns
 * { hasFidelity: false } for menu-only cafés so the UI hides the section.
 */
export async function GET() {
  try {
    const { user } = await requireOwner()
    const business = await getActiveBusiness()
    if (!business) {
      return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    }
    if (!isFidelityLive(business)) return NextResponse.json({ hasFidelity: false })

    const sb: any = await createServiceRoleClient()
    const bid = business.id
    const now = Date.now()
    const dayAgo = new Date(now - 86_400_000).toISOString()
    const weekAgo = new Date(now - 7 * 86_400_000).toISOString()

    const count = async (table: string, build?: (q: any) => any) => {
      let q = sb.from(table).select('id', { count: 'exact', head: true }).eq('business_id', bid)
      if (build) q = build(q)
      const { count: c } = await q
      return c || 0
    }

    const [playsToday, playsWeek, winsPending, redemptionsPending, dinersTotal, dinersWeek, purchasesWeek] = await Promise.all([
      count('plays', (q: any) => q.gte('created_at', dayAgo)),
      count('plays', (q: any) => q.gte('created_at', weekAgo)),
      count('wins', (q: any) => q.eq('status', 'pending')),
      count('loyalty_redemptions', (q: any) => q.eq('status', 'pending')),
      count('diner_accounts'),
      count('diner_accounts', (q: any) => q.gte('created_at', weekAgo)),
      count('points_ledger', (q: any) => q.eq('reason', 'purchase').gte('created_at', weekAgo)),
    ])

    return NextResponse.json({
      hasFidelity: true,
      stats: { playsToday, playsWeek, winsPending, redemptionsPending, dinersTotal, dinersWeek, purchasesWeek },
    })
  } catch (e: any) {
    if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e
    console.error('admin/fidelity-stats:', e?.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
