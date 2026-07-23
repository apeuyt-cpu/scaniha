'use client'

/**
 * Developer Platform — Edit Client Modal
 * Professional dialog for updating client details, plans, rate limits & security settings.
 */

import { useState, useEffect } from 'react'
import type { ApiClient, ApiPlan } from '@/lib/developer-platform/types'

interface EditClientModalProps {
  client: ApiClient
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void
}

export default function EditClientModal({ client, isOpen, onClose, onSaved }: EditClientModalProps) {
  const [plans, setPlans] = useState<ApiPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [companyName, setCompanyName] = useState(client.company_name)
  const [contactName, setContactName] = useState(client.contact_name ?? '')
  const [email, setEmail] = useState(client.email)
  const [phone, setPhone] = useState(client.phone ?? '')
  const [website, setWebsite] = useState(client.website ?? '')
  const [environment, setEnvironment] = useState<'production' | 'sandbox'>(client.environment ?? 'production')
  const [status, setStatus] = useState(client.status)
  const [planId, setPlanId] = useState(client.subscription?.plan_id ?? '')
  
  // Custom rate limits
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState<string>(client.custom_rate_limit_per_minute?.toString() ?? '')
  const [rateLimitPerDay, setRateLimitPerDay] = useState<string>(client.custom_rate_limit_per_day?.toString() ?? '')
  const [rateLimitPerMonth, setRateLimitPerMonth] = useState<string>(client.custom_rate_limit_per_month?.toString() ?? '')
  
  // Security
  const [allowedIps, setAllowedIps] = useState<string>(client.allowed_ips?.join(', ') ?? '')
  const [allowedOrigins, setAllowedOrigins] = useState<string>(client.allowed_origins?.join(', ') ?? '')

  useEffect(() => {
    // Fetch available plans for dropdown
    fetch('/api/developer/plans')
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setPlans(json.data)
        }
      })
      .catch(() => {})
  }, [])

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const payload: Record<string, any> = {
        company_name: companyName,
        contact_name: contactName || undefined,
        email,
        phone: phone || undefined,
        website: website || undefined,
        environment,
        status,
        plan_id: planId || undefined,
        custom_rate_limit_per_minute: rateLimitPerMinute ? parseInt(rateLimitPerMinute, 10) : undefined,
        custom_rate_limit_per_day: rateLimitPerDay ? parseInt(rateLimitPerDay, 10) : undefined,
        custom_rate_limit_per_month: rateLimitPerMonth ? parseInt(rateLimitPerMonth, 10) : undefined,
        allowed_ips: allowedIps ? allowedIps.split(',').map(s => s.trim()).filter(Boolean) : [],
        allowed_origins: allowedOrigins ? allowedOrigins.split(',').map(s => s.trim()).filter(Boolean) : [],
      }

      const res = await fetch(`/api/developer/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`)
      }

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update client')
      }

      setSuccess(true)
      setTimeout(() => {
        if (onSaved) onSaved()
        window.location.reload()
      }, 600)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-[var(--line)] max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] bg-zinc-50 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--ink)]">Edit Client: {client.company_name}</h2>
            <p className="text-xs text-[var(--muted)]">Update company details, assigned plan, rate limits, and security controls.</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 transition">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {error && (
            <div className="rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-200 flex items-start gap-2">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-xl bg-green-50 p-3.5 text-xs text-green-700 border border-green-200 flex items-center gap-2">
              <span>✓</span>
              <p>Client settings updated successfully! Reloading...</p>
            </div>
          )}

          {/* Section 1: Company Profile */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b pb-1">1. Company & Contact Info</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[var(--ink)] mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] px-3.5 py-2 text-sm text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--ink)] mb-1">Contact Name</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-xl border border-[var(--line)] px-3.5 py-2 text-sm text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--ink)] mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] px-3.5 py-2 text-sm text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--ink)] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full rounded-xl border border-[var(--line)] px-3.5 py-2 text-sm text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Account Environment & Status */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b pb-1">2. Environment & Status</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-[var(--ink)] mb-1">Environment</label>
                <select
                  value={environment}
                  onChange={e => setEnvironment(e.target.value as any)}
                  className="w-full rounded-xl border border-[var(--line)] px-3.5 py-2 text-sm text-[var(--ink)] bg-white focus:border-[var(--brand)] focus:outline-none">
                  <option value="production">🚀 Production</option>
                  <option value="sandbox">🧪 Sandbox / Testing</option>
                </select>
                <p className="mt-1 text-[11px] text-zinc-400">Environment dictates key prefixes (sk_live_ vs sk_test_)</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--ink)] mb-1">Account Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full rounded-xl border border-[var(--line)] px-3.5 py-2 text-sm text-[var(--ink)] bg-white focus:border-[var(--brand)] focus:outline-none">
                  <option value="active">🟢 Active</option>
                  <option value="suspended">🔴 Suspended</option>
                  <option value="pending">🟡 Pending Verification</option>
                  <option value="cancelled">⚪ Cancelled</option>
                </select>
                <p className="mt-1 text-[11px] text-zinc-400">Suspended clients cannot authenticate API keys</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--ink)] mb-1">Assigned Plan</label>
                <select
                  value={planId}
                  onChange={e => setPlanId(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] px-3.5 py-2 text-sm text-[var(--ink)] bg-white focus:border-[var(--brand)] focus:outline-none">
                  <option value="">(Default Plan)</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>📦 {p.name} ({p.plan_type})</option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-zinc-400">Determines quota limits and feature toggles</p>
              </div>
            </div>
          </div>

          {/* Section 3: Custom Rate Limit Overrides */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">3. Custom Rate Limits (Optional Overrides)</h3>
              <span className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded text-zinc-500">Leave blank to use Plan Defaults</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-[var(--ink)] mb-1">Req / Minute</label>
                <input
                  type="number"
                  placeholder="e.g. 300"
                  value={rateLimitPerMinute}
                  onChange={e => setRateLimitPerMinute(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] px-3.5 py-2 text-sm text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--ink)] mb-1">Req / Day</label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={rateLimitPerDay}
                  onChange={e => setRateLimitPerDay(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] px-3.5 py-2 text-sm text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--ink)] mb-1">Req / Month</label>
                <input
                  type="number"
                  placeholder="e.g. 500000"
                  value={rateLimitPerMonth}
                  onChange={e => setRateLimitPerMonth(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] px-3.5 py-2 text-sm text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Security & Restrictions */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b pb-1">4. Security Restrictions</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[var(--ink)] mb-1">Allowed IP Addresses</label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.1, 10.0.0.0/24 (comma separated, leave blank for all)"
                  value={allowedIps}
                  onChange={e => setAllowedIps(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] px-3.5 py-2 text-sm text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none font-mono text-xs"
                />
                <p className="mt-1 text-[11px] text-zinc-400">Requests originating from other IPs will be rejected with HTTP 401</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--ink)] mb-1">Allowed Origin Domains</label>
                <input
                  type="text"
                  placeholder="e.g. app.mycompany.com, pos.restaurant.com (comma separated)"
                  value={allowedOrigins}
                  onChange={e => setAllowedOrigins(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] px-3.5 py-2 text-sm text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none font-mono text-xs"
                />
                <p className="mt-1 text-[11px] text-zinc-400">Restricts browser API requests using CORS HTTP Origin header</p>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--line)]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--line)] px-5 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[var(--brand)] px-6 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-[var(--brand-600)] transition disabled:opacity-50">
              {loading ? 'Saving Changes...' : 'Save Client Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
