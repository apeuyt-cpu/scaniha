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

  const maxCount = Math.max(...(data?.daily.map(d => d.count) || [1]), 1)

  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
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
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <p className="text-sm font-semibold text-zinc-700">Visites quotidiennes</p>
              {data.daily.length > 0 ? (
                <div className="mt-4 flex h-36 items-end gap-1.5" style={{ direction: 'ltr' }}>
                  {data.daily.map(day => (
                    <div key={day.date} className="group flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold text-zinc-400">{day.count}</span>
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className="w-full rounded-t-md bg-orange-400 transition-all group-hover:bg-orange-500"
                          style={{ height: `${Math.max((day.count / maxCount) * 100, day.count > 0 ? 6 : 2)}%` }}
                        />
                      </div>
                      <span className="mt-1 truncate text-[10px] leading-none text-zinc-400">{formatDay(day.date)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-zinc-400">Aucune visite durant cette période</p>
              )}
            </div>
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
