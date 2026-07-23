'use client'

/**
 * Developer Platform — API Clients Directory (Interactive Client Component)
 */

import { useState } from 'react'
import Link from 'next/link'
import { IconStore, IconEdit } from '@/components/super-admin/shell/icons'
import type { ApiClient } from '@/lib/developer-platform/types'

export default function ClientsDirectoryClient({
  initialClients,
  initialTotal,
}: {
  initialClients: ApiClient[]
  initialTotal: number
}) {
  const [clients, setClients] = useState<ApiClient[]>(initialClients)
  const [total, setTotal] = useState(initialTotal)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleFilterChange(newSearch: string, newStatus: string) {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: '1',
        per_page: '50',
        ...(newSearch && { search: newSearch }),
        ...(newStatus && { status: newStatus }),
      })
      const res = await fetch(`/api/developer/clients?${params}`)
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setClients(json.data)
        setTotal(json.meta?.total ?? json.data.length)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(c => {
    const matchesSearch = !search || c.company_name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = !statusFilter || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight">API Clients</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{total} registered developer clients</p>
        </div>
        <Link href="/super-admin/developer/clients/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-600)] transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          New Client
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => {
              const val = e.target.value
              setSearch(val)
              handleFilterChange(val, statusFilter)
            }}
            placeholder="Search clients by company or email..."
            className="w-full rounded-xl border border-[var(--line)] bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => {
            const val = e.target.value
            setStatusFilter(val)
            handleFilterChange(search, val)
          }}
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[var(--line)] bg-white shadow-soft overflow-hidden">
        {loading ? (
          <div className="space-y-0 divide-y divide-[var(--line)]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="h-9 w-9 rounded-lg bg-zinc-100"/>
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-36 rounded bg-zinc-100"/>
                  <div className="h-3 w-48 rounded bg-zinc-100"/>
                </div>
                <div className="h-5 w-16 rounded-full bg-zinc-100"/>
              </div>
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 border border-zinc-200">
              <IconStore className="w-8 h-8" />
            </div>
            <div>
              <p className="font-semibold text-[var(--ink)]">No clients found</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {search ? `No results for "${search}"` : 'Create your first API client to get started.'}
              </p>
            </div>
            <Link href="/super-admin/developer/clients/new"
              className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-600)] transition">
              Create Client
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-3 bg-zinc-50">
              <div className="w-9"/>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Company</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 w-28">Plan</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 w-20">Status</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 w-24">Joined</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 w-24 text-right">Action</span>
            </div>
            {filteredClients.map((client) => (
              <div key={client.id}
                className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-4 hover:bg-zinc-50 transition">
                {/* Avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white shadow-xs">
                  {client.company_name.slice(0, 2).toUpperCase()}
                </div>
                {/* Info */}
                <div className="min-w-0">
                  <Link href={`/super-admin/developer/clients/${client.id}`} className="truncate text-sm font-semibold text-[var(--ink)] hover:text-[var(--brand)] hover:underline block">
                    {client.company_name}
                  </Link>
                  <p className="truncate text-xs text-[var(--muted)]">{client.email}</p>
                </div>
                {/* Plan */}
                <div className="w-28">
                  {client.subscription?.plan ? (
                    <span className="text-xs font-medium text-zinc-700 bg-zinc-100 px-2.5 py-0.5 rounded-full border border-zinc-200">
                      {client.subscription.plan.name}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400 font-medium bg-zinc-50 border border-zinc-200 px-2.5 py-0.5 rounded-full">Default</span>
                  )}
                </div>
                {/* Status */}
                <div className="w-20">
                  <StatusBadge status={client.status} />
                </div>
                {/* Date */}
                <div className="w-24">
                  <span className="text-xs text-[var(--muted)]">{fmtDate(client.created_at)}</span>
                </div>
                {/* Action */}
                <div className="w-24 text-right">
                  <Link href={`/super-admin/developer/clients/${client.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-100 transition">
                    <IconEdit className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Manage</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active:    { label: 'Active',    cls: 'bg-green-50 text-green-700 border-green-200' },
    suspended: { label: 'Suspended', cls: 'bg-red-50 text-red-700 border-red-200' },
    pending:   { label: 'Pending',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    cancelled: { label: 'Cancelled', cls: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
  }
  const s = map[status] ?? { label: status, cls: 'bg-zinc-100 text-zinc-500' }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  )
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}
