import PageShell from '@/components/admin/ui/PageShell'
import RecompensesSetup from '@/components/admin/fidelite/RecompensesSetup'

export const dynamic = 'force-dynamic'

export default function RecompensesPage() {
  return (
    <PageShell title="Récompenses & points" subtitle="Combien de points par dinar, et ce que vos clients peuvent échanger." backHref="/admin/fidelite" width="3xl">
      <RecompensesSetup />
    </PageShell>
  )
}
