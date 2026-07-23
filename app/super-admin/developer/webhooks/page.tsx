/**
 * Developer Platform — Webhooks Page
 * /super-admin/developer/webhooks
 */

import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { IconWebhook, IconCheck, IconZap } from '@/components/super-admin/shell/icons'

export const dynamic = 'force-dynamic'

async function getWebhooks(clientId?: string) {
  const admin = await createServiceRoleClient()
  let q = (admin.from('dev_webhooks') as any)
    .select('*, dev_clients(company_name, email)')
    .order('created_at', { ascending: false })
    .limit(50)
  if (clientId) q = q.eq('client_id', clientId)
  const { data } = await q
  return data ?? []
}

async function getRecentEvents() {
  const admin = await createServiceRoleClient()
  const { data } = await (admin.from('dev_webhook_events') as any)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)
  return data ?? []
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active:   { label: 'Active',   cls: 'bg-green-50 text-green-700 border-green-200' },
  disabled: { label: 'Disabled', cls: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
  failing:  { label: 'Failing',  cls: 'bg-red-50 text-red-700 border-red-200' },
}

const EVENT_STATUS: Record<string, string> = {
  delivered: 'bg-green-50 text-green-700 border-green-200',
  failed:    'bg-red-50 text-red-700 border-red-200',
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  retrying:  'bg-blue-50 text-blue-700 border-blue-200',
}

export default async function WebhooksPage({ searchParams }: { searchParams: { client?: string } }) {
  await requireSuperAdmin()
  const [webhooks, events] = await Promise.all([
    getWebhooks(searchParams.client).catch(() => []),
    getRecentEvents().catch(() => []),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight">Webhooks & Real-time Events</h1>
        <p className="mt-0.5 text-sm text-[var(--muted)]">{webhooks.length} registered webhooks</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Webhooks', value: webhooks.length, Icon: IconWebhook },
          { label: 'Active',         value: webhooks.filter((w: any) => w.status === 'active').length, Icon: IconCheck },
          { label: 'Failing',        value: webhooks.filter((w: any) => w.status === 'failing').length, Icon: IconZap },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2 text-zinc-500 mb-2">
              <s.Icon className="w-5 h-5 text-zinc-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{s.label}</span>
            </div>
            <p className="text-3xl font-bold text-[var(--ink)] tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Webhooks list */}
        <div className="rounded-2xl border border-[var(--line)] bg-white shadow-soft overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="font-bold text-[var(--ink)]">Registered Webhooks</h2>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {webhooks.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 border border-zinc-200">
                  <IconWebhook className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-[var(--ink)]">No webhooks registered yet</p>
                <p className="text-xs text-zinc-400">Webhooks dispatch real-time events to client URLs</p>
              </div>
            ) : webhooks.map((wh: any) => {
              const s = STATUS_MAP[wh.status] ?? STATUS_MAP.disabled
              return (
                <div key={wh.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-semibold text-[var(--ink)]">{wh.url}</p>
                      {wh.dev_clients && (
                        <p className="text-xs text-[var(--muted)] mt-0.5">{wh.dev_clients.company_name}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(wh.event_types ?? []).map((et: string) => (
                          <code key={et} className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-mono text-zinc-600 border border-zinc-200">{et}</code>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${s.cls}`}>
                        {s.label}
                      </span>
                      <div className="mt-2 flex gap-3 text-xs text-zinc-400 font-mono">
                        <span className="text-green-600 font-semibold">✓ {wh.total_deliveries - wh.failed_deliveries}</span>
                        <span className="text-red-600 font-semibold">✗ {wh.failed_deliveries}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Events Log */}
        <div className="rounded-2xl border border-[var(--line)] bg-white shadow-soft overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="font-bold text-[var(--ink)]">Recent Webhook Deliveries</h2>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {events.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 border border-zinc-200">
                  <IconZap className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-[var(--ink)]">No webhook event logs yet</p>
              </div>
            ) : events.map((ev: any) => (
              <div key={ev.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-xs font-bold text-[var(--ink)]">{ev.event_type}</code>
                    <span className={`rounded-full border px-2 py-0.2 text-[10px] font-semibold ${EVENT_STATUS[ev.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                      {ev.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--muted)] font-mono mt-0.5">
                    HTTP {ev.response_status ?? '—'} • {ev.response_time_ms ?? 0}ms
                  </p>
                </div>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {new Date(ev.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
