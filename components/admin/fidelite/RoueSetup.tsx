'use client'

import GameManager from '@/components/admin/GameManager'
import { useOwnerBusiness } from './useOwnerBusiness'

/** "La roue" setup page body — the customer roulette config (GameManager). */
export default function RoueSetup() {
  const { business, loading } = useOwnerBusiness()
  if (loading) return <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-400">Chargement…</div>
  if (!business) return <p className="text-zinc-500">Aucun établissement trouvé</p>
  return <GameManager businessId={business.id} slug={business.slug} />
}
