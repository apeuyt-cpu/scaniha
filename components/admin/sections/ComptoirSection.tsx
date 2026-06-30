import AdminRoulette from '@/components/admin/roulette/AdminRoulette'
import PageHeader from '@/components/admin/kit/PageHeader'
import { IconCounter } from '@/components/admin/shell/icons'

/**
 * Re-homed "Roue au comptoir" section (was /admin/roulette): the owner-operated
 * counter wheel — separate from the customer game. Win is saved under the client.
 */
export default function ComptoirSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Roue au comptoir"
        subtitle="La roue que vous faites tourner vous-même — différente du jeu de vos clients. Le gain est enregistré au nom du client."
        icon={<IconCounter width={20} height={20} />}
      />
      <AdminRoulette />
    </div>
  )
}
