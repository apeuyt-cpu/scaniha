'use client'

import LoyaltyManager from '@/components/admin/LoyaltyManager'
import { CardSkeleton } from '@/components/admin/ui/Skeleton'
import { useOwnerBusiness } from './useOwnerBusiness'

/** "Récompenses & points" setup page body — the loyalty config (LoyaltyManager). */
export default function RecompensesSetup() {
  const { business, loading } = useOwnerBusiness()
  if (loading) return <CardSkeleton rows={4} />
  if (!business) return <p className="text-zinc-500">Aucun établissement trouvé</p>
  return <LoyaltyManager businessId={business.id} />
}
