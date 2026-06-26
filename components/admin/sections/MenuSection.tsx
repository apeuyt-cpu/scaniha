'use client'

import MenuManager from '@/components/admin/MenuManager'
import PageHeader from '@/components/admin/kit/PageHeader'
import { CardSkeleton } from '@/components/admin/kit/Skeleton'
import { useOwnerBusiness } from '@/components/admin/fidelite/useOwnerBusiness'
import { IconMenu } from '@/components/admin/shell/icons'

/** Re-homed Menu section: header + the existing MenuManager (logic unchanged). */
export default function MenuSection() {
  const { business, loading } = useOwnerBusiness()
  return (
    <div className="space-y-6">
      <PageHeader title="Menu" subtitle="Vos catégories, plats et prix." icon={<IconMenu width={20} height={20} />} />
      {loading ? <CardSkeleton rows={4} /> : business ? (
        <MenuManager businessId={business.id} />
      ) : (
        <p className="text-[var(--muted)]">Aucun établissement trouvé.</p>
      )}
    </div>
  )
}
