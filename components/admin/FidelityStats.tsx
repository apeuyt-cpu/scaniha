'use client'

import { useEffect, useState } from 'react'
import SectionHeader from '@/components/admin/kit/SectionHeader'
import StatCard from '@/components/admin/kit/StatCard'

interface Stats {
  playsToday: number
  playsWeek: number
  winsPending: number
  redemptionsPending: number
  dinersTotal: number
  dinersWeek: number
  purchasesWeek: number
}

/**
 * Owner fidelity KPIs on the Statistiques page. Self-gating: fetches
 * /api/admin/fidelity-stats and renders nothing for menu-only cafés.
 */
export default function FidelityStats() {
  const [hasFidelity, setHasFidelity] = useState<boolean | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/fidelity-stats')
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        setHasFidelity(Boolean(j.hasFidelity))
        if (j.stats) setStats(j.stats)
      })
      .catch(() => { if (!cancelled) setHasFidelity(false) })
    return () => { cancelled = true }
  }, [])

  if (hasFidelity === false) return null

  const v = (n: number | undefined) => (stats ? n ?? 0 : '—')

  return (
    <section className="mb-8">
      <SectionHeader title="Fidélité" hint="L'activité de votre programme" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Parties (7 j)" value={v(stats?.playsWeek)} hint={stats ? `${stats.playsToday} aujourd'hui` : undefined} />
        <StatCard label="Lots à remettre" value={v(stats?.winsPending)} />
        <StatCard label="Récompenses à remettre" value={v(stats?.redemptionsPending)} />
        <StatCard label="Achats crédités (7 j)" value={v(stats?.purchasesWeek)} />
        <StatCard label="Clients" value={v(stats?.dinersTotal)} hint={stats ? `+${stats.dinersWeek} cette semaine` : undefined} />
      </div>
    </section>
  )
}
