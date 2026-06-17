'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import FidelityToggle from '@/components/admin/game/FidelityToggle'
import { useOwnerBusiness } from './useOwnerBusiness'

/**
 * Fidélité hub landing: the master on/off switch + links to the focused setup
 * pages (la roue, récompenses, caisse, roue au comptoir). One coherent place
 * instead of the old scattered /admin/game + /admin/caisse + /admin/roulette.
 */
export default function FidelityLanding() {
  const { business, loading } = useOwnerBusiness()
  const [status, setStatus] = useState<{ active: boolean; loyaltyActive: boolean } | null>(null)

  useEffect(() => {
    if (!business) return
    let cancelled = false
    fetch(`/api/game/${business.slug}`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setStatus({ active: Boolean(j.active), loyaltyActive: Boolean(j.loyaltyActive) }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [business])

  if (loading) return <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-400">Chargement…</div>
  if (!business) return <p className="text-zinc-500">Aucun établissement trouvé</p>

  return (
    <div className="space-y-5">
      {/* Master switch */}
      <FidelityToggle businessId={business.id} />

      {/* Configure */}
      <div className="space-y-3">
        <NavCard href="/admin/fidelite/roue" primary title="La roue" subtitle="Lots, chances de gagner et conditions de jeu" icon={<IconWheel />} badge={status ? <Badge on={status.active} /> : null} />
        <NavCard href="/admin/fidelite/recompenses" title="Récompenses & points" subtitle="Points par dinar et catalogue de récompenses" icon={<IconGift />} badge={status ? <Badge on={status.loyaltyActive} /> : null} />
      </div>

      {/* Operate, day-to-day */}
      <div className="space-y-3">
        <NavCard href="/admin/caisse" title="Caisse" subtitle="Créditer les points d'un achat, valider les codes" icon={<IconScan />} />
        <NavCard href="/admin/roulette" title="Roue au comptoir" subtitle="La roue que vous faites tourner vous-même, à la caisse" icon={<IconCounter />} />
      </div>
    </div>
  )
}

function NavCard({ href, title, subtitle, icon, primary, badge }: { href: string; title: string; subtitle: string; icon: React.ReactNode; primary?: boolean; badge?: React.ReactNode }) {
  return (
    <Link href={href} className="group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm active:scale-[0.995]">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${primary ? 'bg-orange-50 text-orange-600' : 'bg-zinc-100 text-zinc-600'}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-zinc-900">{title}</span>
          {badge}
        </span>
        <span className="block truncate text-sm text-zinc-500">{subtitle}</span>
      </span>
      <svg className="text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
    </Link>
  )
}

function Badge({ on }: { on: boolean }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${on ? 'bg-orange-50 text-orange-600' : 'bg-zinc-100 text-zinc-400'}`}>
      {on ? 'Active' : 'Inactive'}
    </span>
  )
}

const ic = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
const IconWheel = () => <svg {...ic}><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /></svg>
const IconGift = () => <svg {...ic}><path d="M20 12v8H4v-8M2 7h20v5H2zM12 22V7M12 7S10.5 3 8.5 3 6 5 6 5s1 2 2.5 2M12 7s1.5-4 3.5-4S18 5 18 5s-1 2-2.5 2" /></svg>
const IconScan = () => <svg {...ic}><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M3 12h18" /></svg>
const IconCounter = () => <svg {...ic}><circle cx="12" cy="10" r="6" /><path d="M12 4v6l3 2M5 22h14" /></svg>
