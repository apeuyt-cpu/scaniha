import MenuAnalytics from '@/components/admin/MenuAnalytics'
import FidelityStats from '@/components/admin/FidelityStats'
import PageShell from '@/components/admin/ui/PageShell'

export default function AnalyticsPage() {
  return (
    <PageShell
      title="Statistiques"
      subtitle="Suivez les consultations et l'activité de votre établissement."
      width="5xl"
    >
      {/* Fidelity KPIs (self-hides for menu-only cafés), then menu/page views. */}
      <FidelityStats />
      <MenuAnalytics />
    </PageShell>
  )
}
