'use client'

// Clarity card atop the Fidélité admin: makes it obvious that the wheel and the
// points program are INDEPENDENT (the data layer already supports either alone —
// lib/db/game.ts active vs loyaltyActive). Shows each feature's live customer-
// facing state + a button to jump to its tab. Read-only status (the real toggles
// live in GameManager / LoyaltyManager) so there's no duplicate-state desync.

import { useEffect, useState } from 'react'
import Card from '@/components/admin/kit/Card'

export default function FidelityOverview({ slug, onConfigure }: { slug: string; onConfigure: (tab: 'programme' | 'roue') => void }) {
  const [state, setState] = useState<{ active: boolean; loyaltyActive: boolean } | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/game/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive && j) setState({ active: !!j.active, loyaltyActive: !!j.loyaltyActive }) })
      .catch(() => {})
    return () => { alive = false }
  }, [slug])

  return (
    <Card>
      <h2 className="font-bold text-[var(--ink)]">Votre fidélité, à la carte</h2>
      <p className="mt-0.5 text-sm text-[var(--muted)]">La roue et les points sont indépendants — activez l’un, l’autre, ou les deux.</p>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <FeatureRow emoji="🎡" title="La roue" desc="Vos clients tournent et gagnent un lot." on={state?.active} onClick={() => onConfigure('roue')} />
        <FeatureRow emoji="⭐" title="Les points" desc="Cumul de points + récompenses." on={state?.loyaltyActive} onClick={() => onConfigure('programme')} />
      </div>
    </Card>
  )
}

function FeatureRow({ emoji, title, desc, on, onClick }: { emoji: string; title: string; desc: string; on?: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-3.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)] text-xl" aria-hidden="true">{emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-[var(--ink)]">{title}</p>
          {on === undefined ? (
            <span className="h-4 w-12 animate-pulse rounded-full bg-zinc-100" />
          ) : (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${on ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>{on ? 'Actif' : 'Inactif'}</span>
          )}
        </div>
        <p className="truncate text-xs text-[var(--muted)]">{desc}</p>
      </div>
      <button type="button" onClick={onClick} className="shrink-0 rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:bg-zinc-50">Configurer</button>
    </div>
  )
}
