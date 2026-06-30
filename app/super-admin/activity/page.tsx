import { requireSuperAdmin } from '@/lib/auth'
import ActivityDashboard from '@/components/super-admin/ActivityDashboard'

export const dynamic = 'force-dynamic'

export default async function SuperAdminActivity() {
  await requireSuperAdmin()
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Activité</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Tout ce que font les cafés et les clients — parties, gains, échanges, points, nouveaux clients — avec gestion complète des données.
        </p>
      </div>
      <ActivityDashboard />
    </div>
  )
}
