'use client'

import { useState, useEffect } from 'react'

interface DailyView {
  date: string
  count: number
}

interface AnalyticsData {
  total: number
  mobileViews: number
  desktopViews: number
  daily: DailyView[]
}

const PERIODS = [
  { key: 'today' as const, label: "Aujourd'hui" },
  { key: 'week' as const, label: 'Semaine' },
  { key: 'month' as const, label: 'Mois' },
]

export default function MenuAnalytics() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const fetchAnalytics = () => {
    setLoading(true)
    setFailed(false)
    fetch(`/api/admin/analytics?period=${period}`)
      .then(r => {
        if (!r.ok) throw new Error('request failed')
        return r.json()
      })
      .then(d => { setData(d); setFailed(false) })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
  }
  const formatFull = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
  }

  return (
    <div className="space-y-4">
      {/* Period segmented control */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            aria-pressed={period === p.key}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              period === p.key ? 'bg-white text-orange-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-orange-500" />
        </div>
      ) : failed ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="font-semibold text-zinc-900">Statistiques indisponibles</p>
          <p className="mt-1 text-sm text-zinc-500">Le chargement a échoué. Vérifiez votre connexion et réessayez.</p>
          <button
            onClick={fetchAnalytics}
            className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Réessayer
          </button>
        </div>
      ) : data ? (
        <>
          {/* KPI tiles */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-3xl font-bold text-orange-600">{data.total}</p>
              <p className="mt-1 text-xs font-medium text-orange-500">Visiteurs</p>
            </div>
            <Tile value={data.mobileViews} label="Mobile" icon={<IconPhone />} />
            <Tile value={data.desktopViews} label="Ordinateur" icon={<IconDesktop />} />
          </div>

          {/* Daily chart — hidden for "today" where a single bucket would render a
              degenerate full-width bar. The KPI tiles above already summarise today. */}
          {period === 'today' ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <p className="text-sm font-semibold text-zinc-700">Aujourd&apos;hui</p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-orange-600">{data.total}</span>
                <span className="text-sm font-medium text-zinc-500">visite{data.total > 1 ? 's' : ''} depuis minuit</span>
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                Choisissez « Semaine » ou « Mois » pour voir l&apos;évolution jour par jour.
              </p>
            </div>
          ) : (
            (() => {
              const series = buildDaySeries(data.daily, period)
              const peak = Math.max(...series.map((s) => s.count), 0)
              const totalPeriod = series.reduce((s, d) => s + d.count, 0)
              const avg = Math.round(totalPeriod / series.length)
              return (
                <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-700">Visites quotidiennes</p>
                    {totalPeriod > 0 && (
                      <p className="text-xs text-zinc-400">
                        <span className="font-semibold text-zinc-600">{totalPeriod}</span> au total · {avg}/jour
                      </p>
                    )}
                  </div>

                  {totalPeriod > 0 ? (
                    <div className={`mt-5 flex h-40 items-end ${period === 'month' ? 'gap-[3px]' : 'gap-2'}`} style={{ direction: 'ltr' }}>
                      {series.map((day, i) => {
                        const isToday = i === series.length - 1
                        const isPeak = day.count === peak && day.count > 0
                        const h = day.count > 0 ? Math.max((day.count / peak) * 100, 7) : 0
                        const showLabel =
                          period === 'week' ||
                          i === 0 ||
                          i === series.length - 1 ||
                          i === Math.floor((series.length - 1) / 2)
                        return (
                          <div key={day.date} className="group relative flex flex-1 flex-col items-center justify-end">
                            {/* hover tooltip — exact count + date */}
                            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-zinc-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                              {day.count} visite{day.count > 1 ? 's' : ''} · {formatFull(day.date)}
                            </div>
                            {/* count above the bar — only in week view, where there's room */}
                            {period === 'week' && (
                              <span className={`mb-1 text-[10px] font-bold ${day.count > 0 ? (isToday ? 'text-orange-600' : 'text-zinc-500') : 'text-zinc-300'}`}>
                                {day.count}
                              </span>
                            )}
                            <div className="flex w-full flex-1 items-end">
                              {day.count > 0 ? (
                                <div
                                  className={`w-full rounded-md transition-all ${isToday ? 'bg-orange-500' : isPeak ? 'bg-orange-400' : 'bg-orange-200 group-hover:bg-orange-400'}`}
                                  style={{ height: `${h}%` }}
                                />
                              ) : (
                                <div className="h-[3px] w-full rounded-full bg-zinc-100" />
                              )}
                            </div>
                            <span className={`mt-1.5 h-3 truncate text-[9px] leading-none ${isToday ? 'font-bold text-orange-600' : 'text-zinc-400'}`}>
                              {showLabel ? formatDay(day.date) : ''}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="py-12 text-center text-sm text-zinc-400">Aucune visite durant cette période</p>
                  )}
                </div>
              )
            })()
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white py-12 text-center text-sm text-zinc-400">
          Échec du chargement des statistiques
        </div>
      )}
    </div>
  )
}

// Fill in every day of the period (including 0-visit days) so the chart is a
// continuous timeline instead of a sparse list of only the days that had traffic.
function buildDaySeries(daily: DailyView[], period: 'today' | 'week' | 'month'): DailyView[] {
  const byDate: Record<string, number> = {}
  for (const d of daily) byDate[d.date] = d.count
  const span = period === 'month' ? 30 : 7
  const now = new Date()
  const out: DailyView[] = []
  for (let i = span - 1; i >= 0; i--) {
    // UTC day keys — the API buckets views by their UTC date, so we match that.
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i))
    const date = d.toISOString().slice(0, 10)
    out.push({ date, count: byDate[date] || 0 })
  }
  return out
}

function Tile({ value, label, icon }: { value: number; label: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <span className="text-zinc-400">{icon}</span>
      <p className="mt-1 text-3xl font-bold text-zinc-900">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-zinc-500">{label}</p>
    </div>
  )
}

const IconPhone = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="7" y="2" width="10" height="20" rx="2.5" /><path d="M11 18h2" />
  </svg>
)
const IconDesktop = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
  </svg>
)
