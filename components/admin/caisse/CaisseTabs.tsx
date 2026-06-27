'use client'

import PageHeader from '@/components/admin/kit/PageHeader'
import CaisseConsole from '@/components/admin/caisse/CaisseConsole'
import { IconScan } from '@/components/admin/shell/icons'

/**
 * Caisse section — the day-to-day console. Staff & PIN management now lives in
 * the unified Personnel page (/admin/personnel); the old "Codes PIN" tab and its
 * legacy staff_pins table have been retired.
 */
export default function CaisseTabs() {
  return (
    <div className="space-y-6">
      <PageHeader title="Caisse" subtitle="Créditer les points d'un achat, valider et échanger les codes." icon={<IconScan width={20} height={20} />} />
      <CaisseConsole />
    </div>
  )
}
