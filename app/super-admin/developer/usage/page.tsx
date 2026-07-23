/**
 * Developer Platform — Usage Monitor
 * /super-admin/developer/usage
 */

import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { IconZap, IconChart, IconRefresh, IconGlobe } from '@/components/super-admin/shell/icons'

export const dynamic = 'force-dynamic'

async function getUsageData() {
  const admin = await createServiceRoleClient()

  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const [dailyRes, topClientsRes] = await Promise.all([
    (admin.from('dev_usage_daily') as any)
      .select('day, total_requests, success_requests, error_requests, avg_response_ms, bandwidth_bytes')
      .gte('day', thirtyDaysAgo)
      .order('day', { ascending: true }),
    (admin.from('dev_usage_daily') as any)
      .select('client_id, total_requests')
      .eq('day', today)
      .order('total_requests', { ascending: false })
      .limit(10),
  ])

  return {
    daily: dailyRes.data ?? [],
    topClients: topClientsRes.data ?? [],
  }
}

export default async function UsageMonitorPage() {
  await requireSuperAdmin()
  const { daily, topClients } = await getUsageData().catch(() => ({ daily: [], topClients: [] }))

  const totalThisMonth = daily.reduce((s: number, d: any) => s + (d.total_requests ?? 0), 0)
  const totalErrors    = daily.reduce((s: number, d: any) => s + (d.error_requests ?? 0), 0)
  const avgResponseMs  = daily.length
    ? Math.round(daily.reduce((s: number, d: any) => s + (d.avg_response_ms ?? 0), 0) / daily.length)
    : 0
  const errorRate = totalThisMonth > 0 ? ((totalErrors / totalThisMonth) * 100).toFixed(1) : '0.0'

  // Build chart data for SVG sparklines
  const chartMax = Math.max(...daily.map((d: any) => d.total_requests ?? 0), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight">Usage Monitor</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">Real-time API usage analytics — last 30 days</p>
        </div>
        <Link href="/super-admin/developer/audit"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition">
          View Audit Logs →
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Requests',    value: fmtNum(totalThisMonth), sub: 'last 30 days',                                      Icon: IconZap,     color: 'from-blue-500 to-indigo-600' },
          { label: 'Error Rate',         value: `${errorRate}%`,        sub: `${fmtNum(totalErrors)} errors`,                      Icon: IconRefresh, color: 'from-red-500 to-rose-600' },
          { label: 'Avg Response Time', value: `${avgResponseMs}ms`,   sub: '30-day average',                                     Icon: IconChart,   color: 'from-amber-500 to-orange-600' },
          { label: 'Bandwidth',         value: fmtBytes(daily.reduce((s: number, d: any) => s + (d.bandwidth_bytes ?? 0), 0)), sub: 'transferred', Icon: IconGlobe,   color: 'from-green-500 to-emerald-600' },
        ].map((s) => (
          <div key={s.label} className="relative overflow-hidden rounded-2xl bg-white border border-[var(--line)] p-5 shadow-soft">
            <div className={`absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-white`}>
              <s.Icon className="w-5 h-5" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">{s.label}</p>
            <p className="mt-2 text-3xl font-bold text-[var(--ink)] tabular-nums">{s.value}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-[var(--ink)]">API Requests — 30 Days</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">Total requests per day</p>
          </div>
        </div>

        {daily.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 border border-zinc-200">
              <IconChart className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-[var(--ink)]">No usage data yet</p>
            <p className="text-xs text-zinc-400">Data appears here after API calls are made</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* SVG bar chart */}
              <svg width="100%" height="200" viewBox={`0 0 ${daily.length * 20} 200`} className="overflow-visible">
                {daily.map((d: any, i: number) => {
                  const h = Math.max(2, ((d.total_requests ?? 0) / chartMax) * 160)
                  const eh = Math.max(0, ((d.error_requests ?? 0) / chartMax) * 160)
                  return (
                    <g key={i}>
                      {/* Success bar */}
                      <rect x={i * 20 + 2} y={200 - h} width={14} height={h - eh} rx="2"
                        fill="#6366f1" opacity="0.8" className="hover:opacity-100 transition-opacity">
                        <title>{d.day}: {d.total_requests} requests</title>
                      </rect>
                      {/* Error bar overlay */}
                      {eh > 0 && (
                        <rect x={i * 20 + 2} y={200 - eh} width={14} height={eh} rx="2"
                          fill="#ef4444" opacity="0.8">
                          <title>{d.error_requests} errors</title>
                        </rect>
                      )}
                    </g>
                  )
                })}
              </svg>
              {/* X-axis labels */}
              <div className="flex justify-between mt-2 text-[10px] text-zinc-400">
                <span>{daily[0]?.day?.slice(5)}</span>
                <span>{daily[Math.floor(daily.length / 2)]?.day?.slice(5)}</span>
                <span>{daily[daily.length - 1]?.day?.slice(5)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-5 mt-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-indigo-500"/>
            <span className="text-xs text-[var(--muted)]">Successful</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-red-500"/>
            <span className="text-xs text-[var(--muted)]">Errors</span>
          </div>
        </div>
      </div>

      {/* Daily breakdown table */}
      {daily.length > 0 && (
        <div className="rounded-2xl border border-[var(--line)] bg-white shadow-soft overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="font-bold text-[var(--ink)]">Daily Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-[var(--line)]">
                <tr>
                  {['Date', 'Total Requests', 'Successful', 'Errors', 'Error Rate', 'Avg Response', 'Bandwidth'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {[...daily].reverse().map((d: any) => {
                  const rate = d.total_requests > 0 ? ((d.error_requests / d.total_requests) * 100).toFixed(1) : '0.0'
                  return (
                    <tr key={d.day} className="hover:bg-zinc-50 transition">
                      <td className="px-4 py-3 font-medium text-[var(--ink)]">{d.day}</td>
                      <td className="px-4 py-3 tabular-nums font-semibold">{fmtNum(d.total_requests)}</td>
                      <td className="px-4 py-3 tabular-nums text-green-600">{fmtNum(d.success_requests)}</td>
                      <td className="px-4 py-3 tabular-nums text-red-500">{fmtNum(d.error_requests)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${parseFloat(rate) > 5 ? 'text-red-600' : 'text-zinc-500'}`}>{rate}%</span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[var(--muted)]">{d.avg_response_ms ?? '—'}ms</td>
                      <td className="px-4 py-3 tabular-nums text-[var(--muted)]">{fmtBytes(d.bandwidth_bytes)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function fmtNum(n: number): string {
  if (!n) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function fmtBytes(bytes: number): string {
  if (!bytes) return '0 B'
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB'
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB'
  return bytes + ' B'
}
