import MenuAnalytics from '@/components/admin/MenuAnalytics'
import FidelityStats from '@/components/admin/FidelityStats'
import OrdersAnalytics from '@/components/admin/OrdersAnalytics'
import PageHeader from '@/components/admin/kit/PageHeader'
import { IconChart } from '@/components/admin/shell/icons'

/**
 * Re-homed Statistiques section. Sales KPIs (self-hides unless ordering is live),
 * fidelity KPIs (self-hides for menu-only cafés), then menu/page views. All
 * children self-fetch.
 */
export default function StatsSection() {
  return (
    <div className="space-y-6">
      <PageHeader title="Statistiques" subtitle="Les ventes, les consultations et l'activité de votre établissement." icon={<IconChart width={20} height={20} />} />
      <OrdersAnalytics />
      <FidelityStats />
      <MenuAnalytics />
    </div>
  )
}
