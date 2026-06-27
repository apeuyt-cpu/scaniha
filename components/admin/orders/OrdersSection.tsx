'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/admin/kit/PageHeader'
import Tabs, { useTabParam } from '@/components/admin/kit/Tabs'
import EmptyState from '@/components/admin/kit/EmptyState'
import Spinner from '@/components/admin/kit/Spinner'
import OrdersConsole from '@/components/admin/orders/OrdersConsole'
import OrderingSettings from '@/components/admin/orders/OrderingSettings'
import { isOrderingLive } from '@/lib/design-settings'
import { IconReceipt } from '@/components/admin/shell/icons'

const TABS = [
  { id: 'commandes', label: 'Commandes' },
  { id: 'reglages', label: 'Réglages' },
]

/**
 * Re-homed Commandes section. Consolidates the live console (was /admin/commandes)
 * and the table-QR setup (was /admin/commandes/reglages) into one tabbed page.
 * The console is gated on `isOrderingLive`; when off, a friendly empty state
 * sends the owner to the Réglages tab to enable it.
 */
export default function OrdersSection() {
  const [tab, setTab] = useTabParam(['commandes', 'reglages'], 'commandes')
  const [orderingLive, setOrderingLive] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/business')
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => { if (!cancelled && b) setOrderingLive(isOrderingLive(b)) })
      .catch(() => { if (!cancelled) setOrderingLive(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Commandes" subtitle="Suivez et validez les commandes de vos tables en temps réel." icon={<IconReceipt width={20} height={20} />} />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === 'commandes' ? (
        orderingLive === null ? (
          <Spinner />
        ) : orderingLive ? (
          <OrdersConsole />
        ) : (
          <EmptyState
            icon={<IconReceipt width={24} height={24} />}
            title="La commande à table n'est pas activée"
            message="Activez la commande à table et générez les QR codes pour commencer à recevoir les commandes de vos clients."
            ctaLabel="Aller aux réglages"
            onCta={() => setTab('reglages')}
          />
        )
      ) : (
        <OrderingSettings onChange={(c) => setOrderingLive(c.enabled && c.qrKey.length > 0)} />
      )}
    </div>
  )
}
