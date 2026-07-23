/**
 * Developer Platform — API Keys (Platform-wide)
 * /super-admin/developer/keys
 */

import { requireSuperAdmin } from '@/lib/auth'
import { listAllApiKeys } from '@/lib/developer-platform/api-keys'
import Link from 'next/link'
import { IconKey } from '@/components/super-admin/shell/icons'

export const dynamic = 'force-dynamic'

const TYPE_COLORS: Record<string, string> = {
  public:     'bg-blue-50 text-blue-700',
  secret:     'bg-violet-50 text-violet-700',
  sandbox:    'bg-amber-50 text-amber-700',
  production: 'bg-green-50 text-green-700',
  temporary:  'bg-zinc-100 text-zinc-600',
}

export default async function AllKeysPage({
  searchParams
}: {
  searchParams: { page?: string; search?: string; status?: string }
}) {
  await requireSuperAdmin()

  const page   = Number(searchParams.page ?? 1)
  const search = searchParams.search ?? ''
  const status = searchParams.status ?? ''

  const { keys, total } = await listAllApiKeys({ page, per_page: 25, search, status }).catch(() => ({ keys: [], total: 0 }))
  const perPage = 25

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight">API Keys</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{total} keys across all clients</p>
        </div>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input name="search" defaultValue={search} placeholder="Search by name..."
            className="w-full rounded-xl border border-[var(--line)] bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-orange-100"/>
        </div>
        <select name="status" defaultValue={status}
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="revoked">Revoked</option>
          <option value="expired">Expired</option>
          <option value="rotating">Rotating</option>
        </select>
        <button type="submit"
          className="rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-600)] transition">
          Filter
        </button>
      </form>

      {/* Keys table */}
      <div className="rounded-2xl border border-[var(--line)] bg-white shadow-soft overflow-hidden">
        {keys.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 border border-zinc-200">
              <IconKey className="w-8 h-8" />
            </div>
            <div>
              <p className="font-semibold text-[var(--ink)]">No API keys found</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Keys are created from client profiles</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-3 bg-zinc-50">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Key</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 w-24">Type</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 w-24">Environment</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 w-20">Status</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 w-32">Last Used</span>
            </div>
            {keys.map((key: any) => (
              <div key={key.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-4 hover:bg-zinc-50 transition">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--ink)] truncate">{key.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="font-mono text-xs bg-zinc-50 rounded px-1.5 py-0.5 text-zinc-500">{key.key_prefix}</code>
                    {key.dev_clients && (
                      <Link href={`/super-admin/developer/clients/${key.client_id}`}
                        className="text-xs text-[var(--brand)] hover:underline truncate">
                        {key.dev_clients.company_name}
                      </Link>
                    )}
                  </div>
                </div>
                <div className="w-24">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_COLORS[key.key_type] ?? 'bg-zinc-100 text-zinc-500'}`}>
                    {key.key_type}
                  </span>
                </div>
                <div className="w-24">
                  <span className="text-xs capitalize text-zinc-500">{key.environment}</span>
                </div>
                <div className="w-20">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    key.status === 'active'   ? 'bg-green-50 text-green-700'  :
                    key.status === 'revoked'  ? 'bg-red-50 text-red-700'      :
                    key.status === 'rotating' ? 'bg-blue-50 text-blue-700'    :
                    'bg-zinc-100 text-zinc-500'
                  }`}>
                    {key.status}
                  </span>
                </div>
                <div className="w-32">
                  <span className="text-xs text-[var(--muted)]">
                    {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > perPage && (
          <div className="flex items-center justify-between border-t border-[var(--line)] px-5 py-3">
            <p className="text-xs text-[var(--muted)]">
              Showing {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <a href={`?page=${page - 1}&search=${search}&status=${status}`}
                  className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition">
                  ← Prev
                </a>
              )}
              {page * perPage < total && (
                <a href={`?page=${page + 1}&search=${search}&status=${status}`}
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
