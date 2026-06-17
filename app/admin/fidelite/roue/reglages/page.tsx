import PageShell from '@/components/admin/ui/PageShell'
import RoueReglages from '@/components/admin/fidelite/RoueReglages'

export const dynamic = 'force-dynamic'

export default function RoueReglagesPage() {
  return (
    <PageShell title="Réglages avancés" subtitle="Limites, coûts & stock, conditions de jeu et présence." backHref="/admin/fidelite/roue" width="3xl">
      <RoueReglages />
    </PageShell>
  )
}
