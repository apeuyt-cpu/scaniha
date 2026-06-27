import { requireSuperAdmin } from '@/lib/auth'
import { getAllBusinesses } from '@/lib/db/business'
import { createServiceRoleClient } from '@/lib/supabase/server'
import PaymentReview from '@/components/super-admin/PaymentReview'

export const dynamic = 'force-dynamic'

export default async function SuperAdminPayments() {
  await requireSuperAdmin()

  let businesses: any[] = []
  try {
    businesses = await getAllBusinesses()
  } catch (e) {
    console.error('Error loading businesses:', e)
  }

  let rows: any[] = []
  try {
    const admin = await createServiceRoleClient()
    const { data } = await (admin.from('payment_requests') as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    rows = (data || []).map((r: any) => ({
      ...r,
      businessName: businesses.find((b) => b.id === r.business_id)?.name || r.business_id,
    }))
  } catch {
    rows = []
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Paiements</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Demandes en attente et historique.</p>
      </div>
      <PaymentReview requests={rows} showHistory />
    </div>
  )
}
