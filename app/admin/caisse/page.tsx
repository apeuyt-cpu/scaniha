import PageShell from '@/components/admin/ui/PageShell'
import CaisseConsole from '@/components/admin/caisse/CaisseConsole'

export const dynamic = 'force-dynamic'

export default function CaissePage() {
  return (
    <PageShell title="Caisse">
      <CaisseConsole />
    </PageShell>
  )
}
