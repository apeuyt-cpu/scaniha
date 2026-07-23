'use client'

/**
 * Developer Platform — Client Detail Header with Edit Modal trigger
 */

import { useState } from 'react'
import type { ApiClient } from '@/lib/developer-platform/types'
import EditClientModal from './EditClientModal'
import { IconEdit, IconBox } from '@/components/super-admin/shell/icons'

export default function ClientDetailHeader({ client }: { client: ApiClient }) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [suspending, setSuspending] = useState(false)

  async function handleStatusToggle() {
    const action = client.status === 'active' ? 'suspend' : 'reactivate'
    const confirmMsg = action === 'suspend' 
      ? 'Are you sure you want to suspend this client? Active API keys will be rejected.'
      : 'Reactivate this client account?'
    
    if (!confirm(confirmMsg)) return

    setSuspending(true)
    try {
      await fetch(`/api/developer/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: action, reason: 'Super Admin manual toggle' })
      })
      window.location.reload()
    } catch {
      alert('Action failed')
    } finally {
      setSuspending(false)
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-xl font-bold text-white shadow-lg">
            {client.company_name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight">{client.company_name}</h1>
              <StatusBadge status={client.status} />
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-mono text-zinc-600 uppercase">
                {client.environment ?? 'production'}
              </span>
            </div>
            <p className="text-sm text-[var(--muted)]">{client.email} {client.phone ? `• ${client.phone}` : ''}</p>
            {client.subscription?.plan && (
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 border border-violet-200">
                <IconBox className="w-3.5 h-3.5 text-violet-600" />
                <span>{client.subscription.plan.name} ({client.subscription.plan.plan_type})</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-soft hover:bg-zinc-50 transition">
            <IconEdit className="w-4 h-4 text-zinc-600" />
            <span>Edit Client</span>
          </button>

          {client.status === 'active' ? (
            <button
              onClick={handleStatusToggle}
              disabled={suspending}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 transition disabled:opacity-50">
              {suspending ? 'Suspending...' : 'Suspend'}
            </button>
          ) : (
            <button
              onClick={handleStatusToggle}
              disabled={suspending}
              className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-green-700 transition disabled:opacity-50">
              {suspending ? 'Reactivating...' : 'Reactivate'}
            </button>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <EditClientModal
        client={client}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />
    </>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    'bg-green-50 text-green-700 border-green-200',
    suspended: 'bg-red-50 text-red-700 border-red-200',
    pending:   'bg-amber-50 text-amber-700 border-amber-200',
    cancelled: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  }
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? 'bg-zinc-100 text-zinc-500'}`}>
      {status}
    </span>
  )
}
