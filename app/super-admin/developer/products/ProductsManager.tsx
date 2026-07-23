'use client'

/**
 * Developer Platform — Products & Endpoints Manager
 * Supports viewing, adding, and deleting endpoints per product.
 */

import { useState } from 'react'
import type { ApiProduct, ProductEndpoint } from '@/lib/developer-platform/types'
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

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

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

// ─── Add Endpoint Form ───────────────────────────────────────────────────────

interface AddEndpointFormProps {
  productId: string
  onAdded: (ep: ProductEndpoint) => void
  onCancel: () => void
}

function AddEndpointForm({ productId, onAdded, onCancel }: AddEndpointFormProps) {
  const [method, setMethod] = useState<typeof HTTP_METHODS[number]>('GET')
  const [path, setPath] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [scope, setScope] = useState('')
  const [deprecated, setDeprecated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!path.startsWith('/')) {
      setError('Path must start with /')
      return
    }
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/developer/products/${productId}/endpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          path,
          name: name.trim(),
          description: description.trim() || null,
          scope_required: scope.trim() || null,
          deprecated,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to create endpoint')
      }
      onAdded(json.data as ProductEndpoint)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--brand)] bg-white p-4 shadow-soft space-y-3">
      <p className="text-sm font-bold text-[var(--ink)]">Add Endpoint</p>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {/* Method */}
        <div className="shrink-0">
          <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Method</label>
          <select
            value={method}
            onChange={e => setMethod(e.target.value as typeof HTTP_METHODS[number])}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
          >
            {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Path */}
        <div className="flex-1">
          <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Path</label>
          <input
            required
            type="text"
            value={path}
            onChange={e => setPath(e.target.value)}
            placeholder="/api/v1/resource"
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
          />
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Name</label>
        <input
          required
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. List Menu Categories"
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Description <span className="font-normal text-zinc-400">(optional)</span></label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Brief description of what this endpoint does"
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
        />
      </div>

      {/* Scope */}
      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Scope Required <span className="font-normal text-zinc-400">(optional)</span></label>
        <input
          type="text"
          value={scope}
          onChange={e => setScope(e.target.value)}
          placeholder="e.g. menu:read"
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
        />
      </div>

      {/* Deprecated toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={deprecated}
          onChange={e => setDeprecated(e.target.checked)}
          className="rounded border-zinc-300 text-[var(--brand)] focus:ring-[var(--brand)]"
        />
        <span className="text-xs text-zinc-600">Mark as deprecated</span>
      </label>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 transition"
        >
          {loading ? 'Saving…' : 'Add Endpoint'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ProductsManager({ initialProducts }: { initialProducts: ApiProduct[] }) {
  const [products, setProducts] = useState(initialProducts)
  const [selected, setSelected] = useState<ApiProduct | null>(products[0] ?? null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Keep `selected` in sync with the products list
  function selectProduct(p: ApiProduct) {
    setSelected(products.find(x => x.id === p.id) ?? p)
    setShowAddForm(false)
  }

  function handleEndpointAdded(ep: ProductEndpoint) {
    setProducts(prev => prev.map(p => {
      if (p.id !== selected?.id) return p
      return { ...p, endpoints: [...(p.endpoints ?? []), ep] }
    }))
    setSelected(prev => prev ? { ...prev, endpoints: [...(prev.endpoints ?? []), ep] } : prev)
    setShowAddForm(false)
  }

  async function handleDeleteEndpoint(endpointId: string) {
    if (!selected) return
    setDeletingId(endpointId)
    try {
      const res = await fetch(
        `/api/developer/products/${selected.id}/endpoints/${endpointId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('Delete failed')

      setProducts(prev => prev.map(p => {
        if (p.id !== selected.id) return p
        return { ...p, endpoints: (p.endpoints ?? []).filter(e => e.id !== endpointId) }
      }))
      setSelected(prev => prev
        ? { ...prev, endpoints: (prev.endpoints ?? []).filter(e => e.id !== endpointId) }
        : prev
      )
    } catch {
      alert('Failed to delete endpoint')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight">API Products &amp; Scope Manager</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{products.length} products — {products.reduce((s, p) => s + (p.endpoints?.length ?? 0), 0)} total endpoints</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        {/* Product list */}
        <div className="space-y-2">
          {products.map((p) => (
            <button key={p.id} onClick={() => selectProduct(p)}
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
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--ink)]">
                  Endpoints ({selected.endpoints?.length ?? 0})
                </h3>
                {!showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 transition"
                  >
                    <span>+</span> Add Endpoint
                  </button>
                )}
              </div>

              {/* Add form */}
              {showAddForm && (
                <div className="mb-4">
                  <AddEndpointForm
                    productId={selected.id}
                    onAdded={handleEndpointAdded}
                    onCancel={() => setShowAddForm(false)}
                  />
                </div>
              )}

              {!selected.endpoints || selected.endpoints.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 py-10 text-center">
                  <p className="text-sm text-[var(--muted)]">No endpoints defined yet</p>
                  {!showAddForm && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="mt-3 text-xs font-semibold text-[var(--brand)] hover:underline"
                    >
                      + Add your first endpoint
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selected.endpoints.map((ep) => (
                    <div key={ep.id}
                      className={`group flex items-center justify-between gap-3 rounded-xl border p-4 transition ${ep.deprecated ? 'border-zinc-100 opacity-60' : 'border-[var(--line)] bg-white hover:border-zinc-300'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`shrink-0 rounded-md border px-2.5 py-1 font-mono text-xs font-bold ${METHOD_COLORS[ep.method]}`}>
                          {ep.method}
                        </span>
                        <div className="min-w-0">
                          <code className="font-mono text-xs font-bold text-[var(--ink)]">{ep.path}</code>
                          {ep.name && <p className="text-xs font-medium text-zinc-600 truncate mt-0.5">{ep.name}</p>}
                          {ep.description && <p className="text-xs text-[var(--muted)] truncate mt-0.5">{ep.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {ep.scope_required && (
                          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-mono text-zinc-500">
                            {ep.scope_required}
                          </span>
                        )}
                        {ep.deprecated && (
                          <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-600">
                            deprecated
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteEndpoint(ep.id)}
                          disabled={deletingId === ep.id}
                          className="opacity-0 group-hover:opacity-100 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-100 disabled:opacity-50 transition"
                        >
                          {deletingId === ep.id ? '…' : 'Delete'}
                        </button>
                      </div>
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
