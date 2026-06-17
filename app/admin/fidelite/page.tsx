import PageShell from '@/components/admin/ui/PageShell'
import FidelityLanding from '@/components/admin/fidelite/FidelityLanding'

export const dynamic = 'force-dynamic'

export default function FidelitePage() {
  return (
    <PageShell title="Fidélité" subtitle="La roue, les points, la caisse — tout au même endroit.">
      <FidelityLanding />
    </PageShell>
  )
}
