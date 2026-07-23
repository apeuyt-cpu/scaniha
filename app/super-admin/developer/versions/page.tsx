/**
 * Developer Platform — API Versions Page
 * /super-admin/developer/versions
 */

import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active:     { label: 'Active',     cls: 'bg-green-50 text-green-700' },
  deprecated: { label: 'Deprecated', cls: 'bg-amber-50 text-amber-700' },
  sunset:     { label: 'Sunset',     cls: 'bg-red-50 text-red-700' },
}

export default async function ApiVersionsPage() {
  await requireSuperAdmin()
  const admin = await createServiceRoleClient()
  const { data: versions } = await (admin.from('dev_api_versions') as any)
    .select('*').order('release_date', { ascending: false })

  const versionList = versions ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight">API Versions</h1>
        <p className="mt-0.5 text-sm text-[var(--muted)]">Track active, deprecated, and sunset API versions</p>
      </div>

      {/* Version Timeline */}
      {versionList.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-zinc-200 py-20 text-center">
          <span className="text-5xl">🌐</span>
          <div>
            <p className="font-semibold text-[var(--ink)]">No API versions tracked</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Add your first API version to start tracking</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {versionList.map((v: any, i: number) => {
            const s = STATUS_MAP[v.status] ?? STATUS_MAP.deprecated
            return (
              <div key={v.id} className={`relative rounded-2xl border bg-white p-6 shadow-soft ${v.status === 'active' ? 'border-[var(--brand)]' : 'border-[var(--line)]'}`}>
                {v.status === 'active' && (
                  <div className="absolute top-5 right-5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"/>
                      Current
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 font-bold text-white text-sm">
                    {v.version}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-[var(--ink)]">API {v.version}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>{s.label}</span>
                    </div>
                    <div className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-3 text-xs text-[var(--muted)]">
                      <span>Released: <strong>{v.release_date}</strong></span>
                      {v.sunset_date && <span className="text-red-500">Sunset: <strong>{v.sunset_date}</strong></span>}
                    </div>
                    {v.deprecation_notice && (
                      <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-700">
                        ⚠️ {v.deprecation_notice}
                      </div>
                    )}
                    {v.changelog && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Changelog</p>
                        <p className="text-sm text-[var(--muted)] whitespace-pre-wrap">{v.changelog}</p>
                      </div>
                    )}
                    {v.breaking_changes?.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">⚡ Breaking Changes</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {v.breaking_changes.map((bc: string, j: number) => (
                            <li key={j} className="text-xs text-[var(--muted)]">{bc}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {v.migration_guide && (
                      <a href={v.migration_guide} target="_blank" rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand)] hover:underline">
                        📖 Migration Guide →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
