import PageShell from '@/components/admin/ui/PageShell'
import AdminRoulette from '@/components/admin/roulette/AdminRoulette'

export const dynamic = 'force-dynamic'

export default function AdminRoulettePage() {
  return (
    <PageShell title="Roue au comptoir" subtitle="La roue que vous faites tourner vous-même — différente du jeu de vos clients. Le gain est enregistré au nom du client." backHref="/admin/fidelite">
      <AdminRoulette />
    </PageShell>
  )
}
