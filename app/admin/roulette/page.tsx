import PageShell from '@/components/admin/ui/PageShell'
import AdminRoulette from '@/components/admin/roulette/AdminRoulette'

export const dynamic = 'force-dynamic'

export default function AdminRoulettePage() {
  return (
    <PageShell title="Roulette" subtitle="Faites tourner la roue au comptoir et enregistrez le gain au nom du client.">
      <AdminRoulette />
    </PageShell>
  )
}
