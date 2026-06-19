import { requireOwner } from '@/lib/auth'
import { getActiveBusiness } from '@/lib/db/business'
import DesignStudio from '@/components/admin/DesignStudio'
import PageShell from '@/components/admin/ui/PageShell'

export default async function ThemePage() {
  const { user } = await requireOwner()
  const business = await getActiveBusiness()

  if (!business) {
    return (
      <PageShell title="Design" width="5xl">
        <p className="text-zinc-500">Établissement introuvable</p>
      </PageShell>
    )
  }

  return (
    <PageShell
      title="Design"
      subtitle="Votre marque et l'apparence de votre menu."
      width="5xl"
    >
      <DesignStudio business={business} />
    </PageShell>
  )
}
