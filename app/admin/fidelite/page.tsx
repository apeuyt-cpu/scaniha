import FidelityTabs from '@/components/admin/fidelite/FidelityTabs'
import { getActiveBusiness } from '@/lib/db/business'

export const dynamic = 'force-dynamic'

export default async function FidelitePage() {
  const business = await getActiveBusiness()
  
  if (!business) {
    return <p className="text-[var(--muted)] p-6">Aucun établissement trouvé.</p>
  }

  return <FidelityTabs business={{ id: business.id, slug: business.slug }} />
}
