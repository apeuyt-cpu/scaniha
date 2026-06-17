import PageShell from '@/components/admin/ui/PageShell'
import RoueSetup from '@/components/admin/fidelite/RoueSetup'

export const dynamic = 'force-dynamic'

export default function RouePage() {
  return (
    <PageShell title="La roue" subtitle="La roue de la chance que vos clients font tourner." backHref="/admin/fidelite" width="3xl">
      <RoueSetup />
    </PageShell>
  )
}
