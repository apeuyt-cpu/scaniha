'use client'

/**
 * Developer Platform — Client Detail Tabs
 * Shows API Keys, Usage, Webhooks, Permissions, Billing, Settings tabs with pro SVG icons.
 */

import { useState } from 'react'
import type { ApiClient, ApiKey } from '@/lib/developer-platform/types'
import KeyGenerator from './KeyGenerator'
import EditClientModal from './EditClientModal'
import { IconKey, IconChart, IconWebhook, IconBilling, IconEdit } from '@/components/super-admin/shell/icons'

const TABS = ['API Keys', 'Usage', 'Webhooks', 'Permissions', 'Billing', 'Settings'] as const
type Tab = typeof TABS[number]

export default function ClientDetailTabs({ client }: { client: ApiClient }) {
  const [tab, setTab] = useState<Tab>('API Keys')

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white shadow-soft overflow-hidden">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-[var(--line)] bg-zinc-50 no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-5 py-3.5 text-sm font-semibold transition border-b-2 ${
              tab === t
                ? 'border-[var(--brand)] text-[var(--brand-600)] bg-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {tab === 'API Keys' && <ApiKeysTab client={client} />}
        {tab === 'Usage' && <UsageTab clientId={client.id} />}
        {tab === 'Webhooks' && <WebhooksTab clientId={client.id} />}
        {tab === 'Permissions' && <PermissionsTab client={client} />}
        {tab === 'Billing' && <BillingTab client={client} />}
        {tab === 'Settings' && <SettingsTab client={client} />}
      </div>
    </div>
  )
}

function ApiKeysTab({ client }: { client: ApiClient }) {
  const keys = client.api_keys ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[var(--ink)]">API Keys</h3>
          <p className="text-xs text-[var(--muted)] mt-0.5">{keys.length} key{keys.length !== 1 ? 's' : ''} — raw keys are shown once at creation</p>
        </div>
        <KeyGenerator clientId={client.id} />
      </div>

      {keys.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-200 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
            <IconKey className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-[var(--ink)]">No API keys generated</p>
          <p className="text-xs text-zinc-400">Generate a secret or sandbox key for this client</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key: any) => (
            <KeyRow key={key.id} apiKey={key} />
          ))}
        </div>
      )}
    </div>
  )
}

function KeyRow({ apiKey }: { apiKey: any }) {
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [newRawKey, setNewRawKey] = useState('')

  const typeColors: Record<string, string> = {
    public:     'bg-blue-50 text-blue-700 border-blue-200',
    secret:     'bg-violet-50 text-violet-700 border-violet-200',
    sandbox:    'bg-amber-50 text-amber-700 border-amber-200',
    production: 'bg-green-50 text-green-700 border-green-200',
    temporary:  'bg-zinc-100 text-zinc-600 border-zinc-200',
  }

  async function revoke() {
    if (!confirm('Revoke this API key? Active integrations using this key will stop working.')) return
    setRevoking(true)
    await fetch(`/api/developer/keys/${apiKey.id}/revoke`, { method: 'POST' })
    window.location.reload()
  }

  async function rotate() {
    if (!confirm('Rotate this API key? This revokes the current key and generates a new secret key.')) return
    setRotating(true)
    try {
      const res = await fetch(`/api/developer/keys/${apiKey.id}/rotate`, { method: 'POST' })
      const json = await res.json()
      const returnedKey = json.data?.rawKey || json.data?.raw_key || json.data?.newKey?.rawKey
      if (json.success && returnedKey) {
        setNewRawKey(returnedKey)
      } else {
        window.location.reload()
      }
    } catch {
      window.location.reload()
    } finally {
      setRotating(false)
    }
  }

  function copyPrefix() {
    navigator.clipboard.writeText(apiKey.key_prefix).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--line)] p-4 bg-white">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-[var(--ink)]">{apiKey.name}</span>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${typeColors[apiKey.key_type] ?? 'bg-zinc-100 text-zinc-600'}`}>
              {apiKey.key_type}
            </span>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
              apiKey.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {apiKey.status}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-400">Masked Key ID:</span>
            <code className="font-mono text-xs text-zinc-700 bg-zinc-100 border border-zinc-200 rounded-md px-2 py-0.5">
              {apiKey.key_prefix}
            </code>
            <button onClick={copyPrefix} className="text-xs font-semibold text-[var(--brand)] hover:underline">
              {copied ? '✓ Copied' : 'Copy Prefix'}
            </button>
            {apiKey.last_used_at && (
              <span className="text-xs text-zinc-400">
                • Last used {new Date(apiKey.last_used_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {apiKey.status === 'active' && (
          <div className="flex items-center gap-2">
            <button onClick={rotate} disabled={rotating}
              className="shrink-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition disabled:opacity-50">
              {rotating ? 'Rotating...' : 'Rotate Key'}
            </button>
            <button onClick={revoke} disabled={revoking}
              className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition disabled:opacity-50">
              {revoking ? 'Revoking...' : 'Revoke'}
            </button>
          </div>
        )}
      </div>

      {newRawKey && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2 animate-in fade-in">
          <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">New Rotated Secret Key — Copy Now</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-lg bg-zinc-900 px-3 py-2 font-mono text-xs text-green-400">
              {newRawKey}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newRawKey)
                alert('Rotated key copied to clipboard!')
              }}
              className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-green-700">
              Copy Full Key
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function UsageTab({ clientId }: { clientId: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 border border-violet-100 shadow-soft">
        <IconChart className="w-7 h-7" />
      </div>
      <div>
        <p className="font-semibold text-[var(--ink)]">Usage Analytics</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          View detailed request logs, bandwidth, and traffic rollups in the{' '}
          <a href="/super-admin/developer/usage" className="text-[var(--brand)] font-semibold hover:underline">
            Usage Monitor
          </a>
        </p>
      </div>
    </div>
  )
}

function WebhooksTab({ clientId }: { clientId: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-soft">
        <IconWebhook className="w-7 h-7" />
      </div>
      <div>
        <p className="font-semibold text-[var(--ink)]">Webhooks & Event Subscriptions</p>
        <p className="mt-1 text-sm text-[var(--muted)]">Configure HTTP endpoints to receive real-time event payloads</p>
      </div>
      <a href={`/super-admin/developer/webhooks?client=${clientId}`}
        className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-[var(--brand-600)] transition">
        Manage Webhooks
      </a>
    </div>
  )
}

const ALL_FEATURES = [
  'menu', 'categories', 'items', 'customers', 'orders', 'rewards', 'coupons',
  'spin_wheel', 'scratch_card', 'loyalty', 'analytics', 'notifications',
  'media', 'storage', 'payments', 'pos',
]

function PermissionsTab({ client }: { client: ApiClient }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  
  // Default permissions state map: feature -> { create, read, update, delete, export }
  const [perms, setPerms] = useState<Record<string, Record<string, boolean>>>(() => {
    const map: Record<string, Record<string, boolean>> = {}
    const initialTags = new Set(client.tags || [])
    ALL_FEATURES.forEach(f => {
      // Default enabled if client has feature tag or for core features
      const isEnabled = initialTags.has(f) || ['menu', 'categories', 'items', 'orders', 'customers', 'loyalty'].includes(f)
      map[f] = {
        create: isEnabled,
        read: isEnabled,
        update: isEnabled,
        delete: isEnabled,
        export: isEnabled,
      }
    })
    return map
  })

  function togglePerm(feature: string, op: string) {
    setPerms(prev => ({
      ...prev,
      [feature]: {
        ...prev[feature],
        [op]: !prev[feature]?.[op]
      }
    }))
  }

  function applyPreset(preset: 'all' | 'read' | 'standard') {
    setPerms(prev => {
      const next = { ...prev }
      ALL_FEATURES.forEach(f => {
        if (preset === 'all') {
          next[f] = { create: true, read: true, update: true, delete: true, export: true }
        } else if (preset === 'read') {
          next[f] = { create: false, read: true, update: false, delete: false, export: false }
        } else {
          const isStandard = ['menu', 'categories', 'items', 'orders', 'customers', 'loyalty'].includes(f)
          next[f] = { create: isStandard, read: true, update: isStandard, delete: isStandard, export: isStandard }
        }
      })
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      // Collect all features with at least 1 enabled scope
      const enabledFeatures = ALL_FEATURES.filter(f => Object.values(perms[f] || {}).some(Boolean))
      await fetch(`/api/developer/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: enabledFeatures })
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      alert('Failed to update client permissions')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-[var(--ink)]">Feature Permissions & Access Rights</h3>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Grant or revoke specific API features and granular endpoint operations for this client.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => applyPreset('read')} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100">
            Read Only
          </button>
          <button onClick={() => applyPreset('standard')} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100">
            Standard SaaS
          </button>
          <button onClick={() => applyPreset('all')} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100">
            Full Access
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white shadow-soft hover:bg-[var(--brand-600)] transition disabled:opacity-50">
            {saving ? 'Saving...' : saved ? '✓ Permissions Saved!' : 'Save Permissions'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-zinc-50">
              <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">Platform Feature</th>
              {['create', 'read', 'update', 'delete', 'export'].map(op => (
                <th key={op} className="py-3 px-3 text-center text-[11px] font-bold uppercase tracking-wider text-zinc-500 capitalize">{op}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {ALL_FEATURES.map((f) => (
              <tr key={f} className="hover:bg-zinc-50/80 transition">
                <td className="py-3 px-4 font-semibold capitalize text-[var(--ink)]">
                  {f.replace('_', ' ')}
                </td>
                {['create', 'read', 'update', 'delete', 'export'].map((op) => {
                  const active = perms[f]?.[op] ?? false
                  return (
                    <td key={op} className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => togglePerm(f, op)}
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold transition ${
                          active
                            ? 'bg-green-600 text-white shadow-xs hover:bg-green-700'
                            : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                        }`}>
                        {active ? '✓' : '×'}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BillingTab({ client }: { client: ApiClient }) {
  const sub = client.subscription

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <IconBilling className="w-5 h-5 text-zinc-600" />
        <h3 className="font-semibold text-[var(--ink)]">Billing & Subscription</h3>
      </div>
      {sub ? (
        <div className="rounded-xl border border-[var(--line)] p-5 space-y-3 bg-zinc-50/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--muted)]">Current Plan</span>
            <span className="font-semibold text-[var(--ink)]">{sub.plan?.name ?? 'Default'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--muted)]">Status</span>
            <span className="font-semibold text-[var(--ink)] capitalize">{sub.status}</span>
          </div>
          {sub.billing_cycle && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted)]">Billing Cycle</span>
              <span className="font-semibold text-[var(--ink)] capitalize">{sub.billing_cycle}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-200 py-8 text-center">
          <p className="text-sm text-[var(--muted)]">No custom billing plan attached (Using Platform Defaults)</p>
        </div>
      )}
    </div>
  )
}

function SettingsTab({ client }: { client: ApiClient }) {
  const [isEditOpen, setIsEditOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[var(--ink)]">Client Configuration & Settings</h3>
          <p className="text-xs text-[var(--muted)] mt-0.5">Manage company profile, rate limits, environment, and security restrictions.</p>
        </div>
        <button
          onClick={() => setIsEditOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-[var(--brand-600)] transition">
          <IconEdit className="w-4 h-4 text-white" />
          <span>Edit Client Settings</span>
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: 'Company Name',  value: client.company_name, desc: 'Official business name' },
          { label: 'Contact Person', value: client.contact_name || '—', desc: 'Primary contact name' },
          { label: 'Email Address', value: client.email, desc: 'Billing & notification email' },
          { label: 'Phone Number',  value: client.phone ?? '—', desc: 'Support phone contact' },
          { label: 'Website URL',   value: client.website ?? '—', desc: 'Company web domain' },
          { label: 'Environment',   value: client.environment ?? 'production', desc: 'Dictates API key prefixes (sk_live_ vs sk_test_)' },
          { label: 'Account Status', value: client.status, desc: 'Current account state (active/suspended)' },
          { label: 'Timezone',      value: client.timezone, desc: 'Preferred reporting timezone' },
          { label: 'Req / Minute',  value: client.custom_rate_limit_per_minute ? `${client.custom_rate_limit_per_minute} req/min` : 'Plan Default', desc: 'Per-minute rate limit override' },
          { label: 'Req / Day',     value: client.custom_rate_limit_per_day ? `${client.custom_rate_limit_per_day} req/day` : 'Plan Default', desc: 'Daily quota override' },
          { label: 'Allowed IPs',   value: client.allowed_ips?.length > 0 ? client.allowed_ips.join(', ') : 'All IP Addresses Allowed', desc: 'IP whitelist restrictions' },
          { label: 'Allowed Origins', value: client.allowed_origins?.length > 0 ? client.allowed_origins.join(', ') : 'All Domain Origins Allowed', desc: 'CORS HTTP Origin domain whitelist' },
        ].map((row) => (
          <div key={row.label} className="rounded-xl border border-[var(--line)] p-4 bg-zinc-50/50">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{row.label}</span>
              <span className="text-sm font-semibold text-[var(--ink)] truncate max-w-[60%] text-right">{row.value}</span>
            </div>
            <p className="text-[11px] text-[var(--muted)] mt-1">{row.desc}</p>
          </div>
        ))}
      </div>

      <EditClientModal
        client={client}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />
    </div>
  )
}
