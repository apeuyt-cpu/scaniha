import { NextResponse } from 'next/server'
import { withStaff } from '@/lib/access/withStaff'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { isFidelityLive } from '@/lib/design-settings'

export const dynamic = 'force-dynamic'

/**
 * Owner-scoped fidelity activity for the Statistiques page: plays, lots/rewards
 * waiting to be handed over, purchases credited, and customer counts — all for
 * THIS café only. Counts only (no sums) to stay light on the free tier. Returns
 * { hasFidelity: false } for menu-only cafés so the UI hides the section.
 */
export const GET = withStaff('reports.view', async (_req, { business }) => {
  try {
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

    // Customers = DISTINCT customer_phone across this café's activity tables. Under
    // global identity, diner_accounts.business_id is only the ORIGIN café and
    // caisse-credited phones may have no account row, so counting accounts
    // miscounts. Union the phones from points_ledger / wins / plays instead.
    const distinctPhones = async (sinceIso?: string) => {
      const phones = new Set<string>()
      const tables = ['points_ledger', 'wins', 'plays']
      await Promise.all(
        tables.map(async (table) => {
          let q = sb.from(table).select('customer_phone').eq('business_id', bid)
          if (sinceIso) q = q.gte('created_at', sinceIso)
          const { data } = await q
          ;(data || []).forEach((row: any) => {
            if (row.customer_phone) phones.add(row.customer_phone)
          })
        })
      )
      return phones.size
    }

    const [playsToday, playsWeek, winsPending, redemptionsPending, dinersTotal, dinersWeek, purchasesWeek] = await Promise.all([
      count('plays', (q: any) => q.gte('created_at', dayAgo)),
      count('plays', (q: any) => q.gte('created_at', weekAgo)),
      count('wins', (q: any) => q.eq('status', 'pending')),
      count('loyalty_redemptions', (q: any) => q.eq('status', 'pending')),
      distinctPhones(),
      distinctPhones(weekAgo),
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
})
