'use client'

/**
 * Developer Platform — Products & Endpoints Manager
 */

import { useState } from 'react'
import type { ApiProduct } from '@/lib/developer-platform/types'
import {
  IconPlugin, IconUtensils, IconStar, IconCart, IconUsers,
  IconChart, IconZap, IconTicket, IconRocket
} from '@/components/super-admin/shell/icons'

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-green-50 text-green-700 border-green-200',
  POST:   'bg-blue-50 text-blue-700 border-blue-200',
  PUT:    'bg-amber-50 text-amber-700 border-amber-200',
  PATCH:  'bg-violet-50 text-violet-700 border-violet-200',
  DELETE: 'bg-red-50 text-red-700 border-red-200',
}

const STATUS_COLORS: Record<string, string> = {
  active:     'bg-green-50 text-green-700 border-green-200',
  beta:       'bg-blue-50 text-blue-700 border-blue-200',
  deprecated: 'bg-amber-50 text-amber-700 border-amber-200',
  hidden:     'bg-zinc-100 text-zinc-500 border-zinc-200',
}

function ProductIcon({ slug, className = "w-5 h-5 text-zinc-700" }: { slug?: string; className?: string }) {
  switch (slug) {
    case 'qr-menu':   return <IconUtensils className={className} />
    case 'loyalty':   return <IconStar className={className} />
    case 'orders':    return <IconCart className={className} />
    case 'customers': return <IconUsers className={className} />
    case 'analytics': return <IconChart className={className} />
    case 'games':     return <IconZap className={className} />
    case 'coupons':   return <IconTicket className={className} />
    case 'everything':return <IconRocket className={className} />
    default:          return <IconPlugin className={className} />
  }
}

export default function ProductsManager({ initialProducts }: { initialProducts: ApiProduct[] }) {
  const [products] = useState(initialProducts)
  const [selected, setSelected] = useState<ApiProduct | null>(products[0] ?? null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight">API Products & Scope Manager</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{products.length} products — {products.reduce((s, p) => s + (p.endpoints?.length ?? 0), 0)} total endpoints</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        {/* Product list */}
        <div className="space-y-2">
          {products.map((p) => (
            <button key={p.id} onClick={() => setSelected(p)}
              className={`w-full text-left rounded-2xl border p-4 transition ${
                selected?.id === p.id
                  ? 'border-[var(--brand)] bg-[var(--brand-soft)] shadow-soft'
                  : 'border-[var(--line)] bg-white hover:border-zinc-300 hover:bg-zinc-50'
              }`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 border border-zinc-200">
                  <ProductIcon slug={p.slug} className="w-5 h-5 text-zinc-700" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--ink)]">{p.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`rounded-full border px-2 py-0.2 text-[10px] font-bold ${STATUS_COLORS[p.status]}`}>
                      {p.status}
                    </span>
                    <span className="text-[11px] text-zinc-500">{p.endpoints?.length ?? 0} endpoints</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Product detail */}
        {selected ? (
          <div className="rounded-2xl border border-[var(--line)] bg-white shadow-soft overflow-hidden">
            {/* Header */}
            <div className="border-b border-[var(--line)] p-5 bg-zinc-50/50">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white border border-zinc-200 shadow-soft">
                  <ProductIcon slug={selected.slug} className="w-6 h-6 text-zinc-800" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-[var(--ink)] text-lg">{selected.name}</h2>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${STATUS_COLORS[selected.status]}`}>
                      {selected.status}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-mono text-zinc-600 border border-zinc-200">{selected.version}</span>
                  </div>
                  {selected.description && <p className="mt-1 text-sm text-[var(--muted)]">{selected.description}</p>}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Base path:</span>
                  <code className="rounded-lg bg-zinc-900 px-2.5 py-1 font-mono text-xs text-green-400">{selected.base_path}</code>
                </div>
              </div>
            </div>

            {/* Endpoints */}
            <div className="p-5">
              <h3 className="mb-3 text-sm font-bold text-[var(--ink)]">
                Endpoints ({selected.endpoints?.length ?? 0})
              </h3>
              {!selected.endpoints || selected.endpoints.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 py-10 text-center">
                  <p className="text-sm text-[var(--muted)]">No endpoints defined yet</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selected.endpoints.map((ep) => (
                    <div key={ep.id}
                      className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition ${ep.deprecated ? 'border-zinc-100 opacity-60' : 'border-[var(--line)] bg-white hover:border-zinc-300'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`shrink-0 rounded-md border px-2.5 py-1 font-mono text-xs font-bold ${METHOD_COLORS[ep.method]}`}>
                          {ep.method}
                        </span>
                        <div className="min-w-0">
                          <code className="font-mono text-xs font-bold text-[var(--ink)]">{ep.path}</code>
                          {ep.description && <p className="text-xs text-[var(--muted)] truncate mt-0.5">{ep.description}</p>}
                        </div>
                      </div>
                      {ep.scope_required && (
                        <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-mono text-zinc-500">
                          {ep.scope_required}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 p-12 text-center">
            <IconPlugin className="w-8 h-8 text-zinc-400 mb-2" />
            <p className="text-sm font-semibold text-[var(--ink)]">Select a product to inspect endpoints</p>
          </div>
        )}
      </div>
    </div>
  )
}
