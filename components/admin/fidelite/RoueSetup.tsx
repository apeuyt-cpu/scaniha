'use client'

import GameManager from '@/components/admin/GameManager'
import { CardSkeleton } from '@/components/admin/ui/Skeleton'
import { useOwnerBusiness } from './useOwnerBusiness'

/** "La roue" setup page body — the customer roulette config (GameManager). */
export default function RoueSetup() {
  const { business, loading } = useOwnerBusiness()
  if (loading) return <CardSkeleton rows={4} />
  if (!business) return <p className="text-zinc-500">Aucun établissement trouvé</p>
  return <GameManager businessId={business.id} slug={business.slug} />
}
