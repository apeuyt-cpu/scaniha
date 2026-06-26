'use client'

// Sales KPIs from table orders: revenue, order count, average basket, a
// revenue-by-day bar strip, and the top items. Self-fetches; renders nothing for
// cafés without table ordering live (so menu/fidelity-only admins are unaffected).

import { useEffect, useState } from 'react'
import Card from '@/components/admin/kit/Card'
import { isOrderingLive } from '@/lib/design-settings'

interface Stats {
  days: number
  revenue: number
  orderCount: number
  aov: number
  byDay: { date: string; revenue: number; count: number }[]
  topItems: { name: string; qty: number; revenue: number }[]
}

const PERIODS = [
  { d: 7, label: '7 j' },
  { d: 30, label: '30 j' },
  { d: 90, label: '90 j' },
]

function tnd(n: number, decimals = false): string {
  return `${Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: decimals ? 2 : 0 })} TND`
}

export default function OrdersAnalytics() {
  const [show, setShow] = useState<boolean | null>(null) // null = unknown (hide)
  const [days, setDays] = useState(30)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  // Decide visibility once (ordering live?).
  useEffect(() => {
    let alive = true
    fetch('/api/admin/business')
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => { if (alive) setShow(b ? isOrderingLive(b) : false) })
      .catch(() => { if (alive) setShow(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!show) return
    let alive = true
    setLoading(true)
    fetch(`/api/admin/orders/stats?days=${days}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive && j) setStats(j as Stats) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [show, days])

  if (show !== true) return null

  const maxDay = stats ? Math.max(1, ...stats.byDay.map((d) => d.revenue)) : 1
  const maxItem = stats ? Math.max(1, ...stats.topItems.map((t) => t.revenue)) : 1

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-[var(--ink)]">Commandes — performance</h2>
          <p className="mt-0.5 text-sm text-[var(--muted)]">Chiffre d’affaires des commandes à table (hors commandes refusées).</p>
        </div>
        <div className="inline-flex overflow-hidden rounded-xl border border-[var(--line)]">
          {PERIODS.map((p) => (
            <button
              key={p.d}
              type="button"
              onClick={() => setDays(p.d)}
              aria-pressed={days === p.d}
              className={`px-3 py-1.5 text-xs font-semibold transition ${days === p.d ? 'bg-[var(--brand)] text-white' : 'bg-white text-[var(--muted)] hover:bg-zinc-50'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !stats ? (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-100" />)}
        </div>
      ) : stats && stats.orderCount === 0 ? (
        <p className="mt-4 rounded-xl border border-[var(--line)] bg-zinc-50 px-4 py-6 text-center text-sm text-[var(--muted)]">
          Aucune commande sur cette période. Les ventes apparaîtront ici dès la première commande.
        </p>
      ) : stats ? (
        <>
          {/* KPIs */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Kpi label="Chiffre d’affaires" value={tnd(stats.revenue)} />
            <Kpi label="Commandes" value={String(stats.orderCount)} />
            <Kpi label="Panier moyen" value={tnd(stats.aov, true)} />
          </div>

          {/* Revenue-by-day bars */}
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Chiffre d’affaires par jour</p>
            <div className="flex h-28 items-end gap-[3px]" role="img" aria-label="Chiffre d’affaires par jour">
              {stats.byDay.map((d) => (
                <div
                  key={d.date}
                  className="flex-1 rounded-t-sm bg-[var(--brand)] transition-all"
                  style={{ height: `${Math.max(2, (d.revenue / maxDay) * 100)}%`, opacity: d.revenue ? 1 : 0.25 }}
                  title={`${new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} — ${tnd(d.revenue)} · ${d.count} cmd`}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[var(--muted)]">
              <span>{stats.byDay.length ? new Date(stats.byDay[0].date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : ''}</span>
              <span>Aujourd’hui</span>
            </div>
          </div>

          {/* Top items */}
          {stats.topItems.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Plats les plus vendus</p>
              <ul className="space-y-2">
                {stats.topItems.map((t) => (
                  <li key={t.name}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-medium text-[var(--ink)]">{t.name}</span>
                      <span className="shrink-0 tabular-nums text-[var(--muted)]">{t.qty}× · {tnd(t.revenue)}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${Math.max(4, (t.revenue / maxItem) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : null}
    </Card>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
      <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-[var(--ink)]">{value}</p>
    </div>
  )
}
