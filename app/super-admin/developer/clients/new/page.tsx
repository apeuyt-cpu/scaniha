'use client'

/**
 * Developer Platform — Create API Client
 * /super-admin/developer/clients/new
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const PLAN_OPTIONS = [
  { value: '', label: 'No plan (assign later)' },
  { value: 'free', label: 'Free' },
  { value: 'starter', label: 'Starter — $29/mo' },
  { value: 'growth', label: 'Growth — $99/mo' },
  { value: 'enterprise', label: 'Enterprise (Custom)' },
]

export default function NewClientPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    company_name: '', owner_name: '', email: '', phone: '', website: '',
    notes: '', tags: '', status: 'active',
    allowed_ips: '', allowed_origins: '', allowed_countries: '',
  })

  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body = {
        company_name:  form.company_name,
        owner_name:    form.owner_name || null,
        email:         form.email,
        phone:         form.phone || null,
        website:       form.website || null,
        notes:         form.notes || null,
        status:        form.status,
        tags:          form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        allowed_ips:   form.allowed_ips ? form.allowed_ips.split(',').map(s => s.trim()).filter(Boolean) : [],
        allowed_origins: form.allowed_origins ? form.allowed_origins.split(',').map(s => s.trim()).filter(Boolean) : [],
        allowed_countries: form.allowed_countries ? form.allowed_countries.split(',').map(s => s.trim()).filter(Boolean) : [],
      }
      const res = await fetch('/api/developer/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const contentType = res.headers.get('content-type') || ''
      let json: any = null

      if (contentType.includes('application/json')) {
        json = await res.json()
      } else {
        const rawText = await res.text()
        try {
          json = JSON.parse(rawText)
        } catch {
          let textSnippet = rawText.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                                  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                                  .replace(/<[^>]+>/g, ' ')
                                  .replace(/\s+/g, ' ')
                                  .trim()
          if (textSnippet.length > 250) textSnippet = textSnippet.slice(0, 250) + '…'

          json = {
            success: false,
            error: {
              message: textSnippet || `Server returned HTTP ${res.status}: ${res.statusText || 'Internal Server Error'}`
            }
          }
        }
      }

      if (res.ok && json?.success) {
        router.push(`/super-admin/developer/clients/${json.data.id}`)
      } else {
        setError(json?.error?.message ?? `Failed to create client (HTTP ${res.status})`)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating client')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/super-admin/developer/clients" className="text-[var(--muted)] hover:text-[var(--ink)] transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--ink)]">New API Client</h1>
          <p className="text-sm text-[var(--muted)]">Add a new B2B developer to the platform</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Company Info */}
        <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-soft space-y-4">
          <h2 className="text-sm font-bold text-[var(--ink)]">Company Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company Name *" required>
              <input value={form.company_name} onChange={set('company_name')} required
                placeholder="Acme Corp"
                className="dev-input" />
            </Field>
            <Field label="Owner / Contact Name">
              <input value={form.owner_name} onChange={set('owner_name')}
                placeholder="John Smith"
                className="dev-input" />
            </Field>
            <Field label="Email Address *" required>
              <input value={form.email} onChange={set('email')} required type="email"
                placeholder="dev@acme.com"
                className="dev-input" />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={set('phone')}
                placeholder="+1 555 000 0000"
                className="dev-input" />
            </Field>
            <Field label="Website" className="sm:col-span-2">
              <input value={form.website} onChange={set('website')}
                placeholder="https://acme.com"
                className="dev-input" />
            </Field>
          </div>
        </section>

        {/* Status & Tags */}
        <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-soft space-y-4">
          <h2 className="text-sm font-bold text-[var(--ink)]">Status & Classification</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <select value={form.status} onChange={set('status')} className="dev-input">
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </Field>
            <Field label="Tags (comma-separated)">
              <input value={form.tags} onChange={set('tags')}
                placeholder="fintech, enterprise, beta"
                className="dev-input" />
            </Field>
          </div>
        </section>

        {/* Access Restrictions */}
        <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-soft space-y-4">
          <h2 className="text-sm font-bold text-[var(--ink)]">Access Restrictions</h2>
          <p className="text-xs text-[var(--muted)]">Leave empty for no restrictions. Use comma-separated values.</p>
          <div className="grid gap-4">
            <Field label="Allowed IP Addresses">
              <input value={form.allowed_ips} onChange={set('allowed_ips')}
                placeholder="192.168.1.1, 10.0.0.0/24"
                className="dev-input" />
            </Field>
            <Field label="Allowed Origins">
              <input value={form.allowed_origins} onChange={set('allowed_origins')}
                placeholder="https://app.acme.com, https://acme.com"
                className="dev-input" />
            </Field>
            <Field label="Allowed Countries (ISO codes)">
              <input value={form.allowed_countries} onChange={set('allowed_countries')}
                placeholder="US, GB, CA"
                className="dev-input" />
            </Field>
          </div>
        </section>

        {/* Notes */}
        <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-soft space-y-4">
          <h2 className="text-sm font-bold text-[var(--ink)]">Internal Notes</h2>
          <textarea value={form.notes} onChange={set('notes')} rows={3}
            placeholder="Internal notes about this client..."
            className="dev-input resize-none" />
        </section>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pb-4">
          <Link href="/super-admin/developer/clients"
            className="rounded-xl border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition">
            Cancel
          </Link>
          <button type="submit" disabled={saving}
            className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-600)] disabled:opacity-60 transition">
            {saving ? 'Creating…' : 'Create Client'}
          </button>
        </div>
      </form>

      <style jsx global>{`
        .dev-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--line);
          background: white;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .dev-input:focus {
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(244, 123, 32, 0.1);
        }
      `}</style>
    </div>
  )
}

function Field({ label, required, className, children }: {
  label: string; required?: boolean; className?: string; children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
