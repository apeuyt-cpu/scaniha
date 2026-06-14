import MenuAnalytics from '@/components/admin/MenuAnalytics'
import PageShell from '@/components/admin/ui/PageShell'

export default function AnalyticsPage() {
  return (
    <PageShell
      title="Statistiques"
      subtitle="Suivez les consultations et les performances de votre menu."
      width="5xl"
    >
      <MenuAnalytics />
    </PageShell>
  )
}
