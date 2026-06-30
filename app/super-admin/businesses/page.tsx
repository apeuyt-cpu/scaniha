import { requireSuperAdmin } from '@/lib/auth'
import { getAllBusinesses } from '@/lib/db/business'
import BusinessManager from '@/components/super-admin/BusinessManager'

export const dynamic = 'force-dynamic'

export default async function SuperAdminComptes() {
  await requireSuperAdmin()
  let businesses: any[] = []
  try {
    businesses = await getAllBusinesses()
  } catch (e) {
    console.error('Error loading businesses:', e)
  }
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Comptes</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Tous les établissements et leurs abonnements.</p>
      </div>
      <BusinessManager businesses={businesses} />
    </div>
  )
}
