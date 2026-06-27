'use client'

import { useState } from 'react'
import PageHeader from '@/components/admin/kit/PageHeader'
import Tabs, { useTabParam } from '@/components/admin/kit/Tabs'
import { CardSkeleton } from '@/components/admin/kit/Skeleton'
import FidelityToggle from '@/components/admin/game/FidelityToggle'
import FidelityOverview from '@/components/admin/fidelite/FidelityOverview'
import LoyaltyManager from '@/components/admin/LoyaltyManager'
import GameManager from '@/components/admin/GameManager'
import RoueReglages from '@/components/admin/fidelite/RoueReglages'
import { useOwnerBusiness } from '@/components/admin/fidelite/useOwnerBusiness'
import { IconGift, IconChevron } from '@/components/admin/shell/icons'

const TABS = [
  { id: 'programme', label: 'Programme & points' },
  { id: 'roue', label: 'La roue' },
]

/**
 * Re-homed Fidélité section — consolidates four legacy routes into one tabbed
 * page:
 *   • Programme & points  = master fidelity switch + LoyaltyManager
 *                           (was /admin/fidelite + /admin/fidelite/recompenses)
 *   • La roue             = customer wheel (GameManager) + advanced settings
 *                           accordion (was /admin/fidelite/roue + .../roue/reglages)
 * Daily-ops (caisse, comptoir) moved out to the Opérations group.
 */
export default function FidelityTabs() {
  const { business, loading } = useOwnerBusiness()
  const [tab, setTab] = useTabParam(['programme', 'roue'], 'programme')
  const [advancedOpen, setAdvancedOpen] = useState(false)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Fidélité" subtitle="La roue, les points et les récompenses — tout au même endroit." icon={<IconGift width={20} height={20} />} />
      {!loading && business && <FidelityOverview slug={business.slug} onConfigure={setTab} />}
      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {loading ? (
        <CardSkeleton rows={4} />
      ) : !business ? (
        <p className="text-[var(--muted)]">Aucun établissement trouvé.</p>
      ) : tab === 'programme' ? (
        <div className="space-y-5">
          <FidelityToggle businessId={business.id} />
          <LoyaltyManager businessId={business.id} />
        </div>
      ) : (
        <div className="space-y-5">
          <GameManager businessId={business.id} slug={business.slug} />

          {/* Advanced wheel settings — limits, costs/stock, play conditions, presence. */}
          <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-soft">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              aria-expanded={advancedOpen}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <span>
                <span className="block text-sm font-bold text-[var(--ink)]">Réglages avancés</span>
                <span className="block text-xs text-[var(--muted)]">Limites, coûts &amp; stock, conditions de jeu et présence.</span>
              </span>
              <span className={`shrink-0 text-zinc-400 transition ${advancedOpen ? 'rotate-90' : ''}`}>
                <IconChevron width={20} height={20} />
              </span>
            </button>
            {advancedOpen && (
              <div className="border-t border-[var(--line)] p-5 sm:p-6">
                <RoueReglages />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
