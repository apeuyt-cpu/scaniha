/**
 * Developer Platform — Audit Logs Page
 * /super-admin/developer/audit
 */

import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { IconFile } from '@/components/super-admin/shell/icons'

export const dynamic = 'force-dynamic'

async function getAuditLogs(page = 1, search = '', action = '') {
  const admin  = await createServiceRoleClient()
  const limit  = 30
  const offset = (page - 1) * limit

  let q = (admin.from('dev_audit_logs') as any)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (action) q = q.eq('action', action)
  if (search) q = q.or(`actor_id.ilike.%${search}%,resource_id.ilike.%${search}%,action.ilike.%${search}%`)

  const { data, error, count } = await q
  return { logs: data ?? [], total: count ?? 0 }
}

const ACTION_COLORS: Record<string, string> = {
  'key.created':    'bg-green-50 text-green-700',
  'key.revoked':    'bg-red-50 text-red-700',
  'key.rotated':    'bg-blue-50 text-blue-700',
  'client.created': 'bg-violet-50 text-violet-700',
  'client.suspended': 'bg-orange-50 text-orange-700',
  'client.reactivated': 'bg-emerald-50 text-emerald-700',
  'plan.created':   'bg-indigo-50 text-indigo-700',
  'plan.updated':   'bg-sky-50 text-sky-700',
  'plan.deleted':   'bg-red-50 text-red-700',
}

export default async function AuditLogsPage({
  searchParams
}: {
  searchParams: { page?: string; search?: string; action?: string }
}) {
  await requireSuperAdmin()

  const page   = Number(searchParams.page ?? 1)
  const search = searchParams.search ?? ''
  const action = searchParams.action ?? ''

  const { logs, total } = await getAuditLogs(page, search, action).catch(() => ({ logs: [], total: 0 }))
  const perPage = 30
  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight">Audit Logs</h1>
        <p className="mt-0.5 text-sm text-[var(--muted)]">Immutable record of all platform actions — {total} entries</p>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input name="search" defaultValue={search} placeholder="Search by actor, resource, or action..."
            className="w-full rounded-xl border border-[var(--line)] bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-orange-100"/>
        </div>
        <select name="action" defaultValue={action}
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]">
          <option value="">All actions</option>
          <optgroup label="Keys">
            <option value="key.created">key.created</option>
            <option value="key.revoked">key.revoked</option>
            <option value="key.rotated">key.rotated</option>
          </optgroup>
          <optgroup label="Clients">
            <option value="client.created">client.created</option>
            <option value="client.suspended">client.suspended</option>
            <option value="client.updated">client.updated</option>
          </optgroup>
          <optgroup label="Plans">
            <option value="plan.created">plan.created</option>
            <option value="plan.updated">plan.updated</option>
            <option value="plan.deleted">plan.deleted</option>
          </optgroup>
        </select>
        <button type="submit"
          className="rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-600)] transition">
          Filter
        </button>
      </form>

      {/* Logs Table */}
      <div className="rounded-2xl border border-[var(--line)] bg-white shadow-soft overflow-hidden">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
              <IconFile className="w-6 h-6" />
            </div>
            <p className="font-semibold text-[var(--ink)]">No audit logs</p>
            <p className="text-sm text-[var(--muted)]">Platform actions will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-5 py-3 bg-zinc-50">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 w-36">Timestamp</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Action</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 w-32">Resource</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 w-20">Actor</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 w-24">IP</span>
            </div>
            {logs.map((log: any) => (
              <div key={log.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 transition">
                <div className="w-36">
                  <p className="text-xs font-mono text-[var(--muted)]">
                    {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold font-mono ${ACTION_COLORS[log.action] ?? 'bg-zinc-100 text-zinc-600'}`}>
                    {log.action}
                  </span>
                </div>
                <div className="w-32">
                  <p className="text-xs text-zinc-500 truncate">
                    <span className="font-medium">{log.resource_type}</span>
                    {log.resource_id && <span className="text-zinc-400"> · {log.resource_id.slice(0, 8)}…</span>}
                  </p>
                </div>
                <div className="w-20">
                  <p className="text-xs text-zinc-500">
                    {log.actor_type === 'super_admin' ? '👤' : log.actor_type === 'system' ? '🤖' : '🏢'}
                    {' '}{log.actor_id ? log.actor_id.slice(0, 8) + '…' : 'system'}
                  </p>
                </div>
                <div className="w-24">
                  <p className="text-xs font-mono text-zinc-400 truncate">{log.ip_address ?? '—'}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--line)] px-5 py-3">
            <p className="text-xs text-[var(--muted)]">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <a href={`?page=${page - 1}&search=${search}&action=${action}`}
                  className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition">
                  ← Prev
                </a>
              )}
              {page < totalPages && (
                <a href={`?page=${page + 1}&search=${search}&action=${action}`}
                  className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition">
                  Next →
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
