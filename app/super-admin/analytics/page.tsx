import { requireSuperAdmin } from '@/lib/auth'
import SuperAdminAnalytics from '@/components/admin/SuperAdminAnalytics'

export const dynamic = 'force-dynamic'

export default async function SuperAdminStats() {
  await requireSuperAdmin()
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Statistiques</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Visites des menus par établissement.</p>
      </div>
      <SuperAdminAnalytics />
    </div>
  )
}
