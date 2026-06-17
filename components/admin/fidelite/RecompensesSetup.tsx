'use client'

import LoyaltyManager from '@/components/admin/LoyaltyManager'
import { useOwnerBusiness } from './useOwnerBusiness'

/** "Récompenses & points" setup page body — the loyalty config (LoyaltyManager). */
export default function RecompensesSetup() {
  const { business, loading } = useOwnerBusiness()
  if (loading) return <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-400">Chargement…</div>
  if (!business) return <p className="text-zinc-500">Aucun établissement trouvé</p>
  return <LoyaltyManager businessId={business.id} />
}
