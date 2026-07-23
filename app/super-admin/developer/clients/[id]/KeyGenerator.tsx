'use client'

/**
 * Developer Platform — Key Generator Dialog
 * Embedded in the Client Detail page.
 */

import { useState } from 'react'
import { IconKey } from '@/components/super-admin/shell/icons'

interface Props { clientId: string }

export default function KeyGenerator({ clientId }: Props) {
  const [open, setOpen]   = useState(false)
  const [saving, setSaving] = useState(false)
  const [rawKey, setRawKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [form, setForm]   = useState({
    name: '', key_type: 'secret', environment: 'production', scopes: '',
  })

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/developer/clients/${clientId}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        form.name,
          key_type:    form.key_type,
          environment: form.environment,
          scopes:      form.scopes ? form.scopes.split(',').map(s => s.trim()).filter(Boolean) : [],
        }),
      })
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        throw new Error(`Server returned status ${res.status}`)
      }
      const json = await res.json()
      const returnedRawKey = json.data?.rawKey || json.data?.raw_key
      if (json.success && returnedRawKey) {
        setRawKey(returnedRawKey)
      }
    } finally {
      setSaving(false)
    }
  }

  function copyKey() {
    navigator.clipboard.writeText(rawKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    })
  }

  function close() {
    setOpen(false)
    setRawKey('')
    setCopied(false)
    setForm({ name: '', key_type: 'secret', environment: 'production', scopes: '' })
    if (rawKey) window.location.reload()
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-600)] transition">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
        Generate Key
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-6 shadow-soft-lg animate-[adminSheetIn_.2s_ease-out]">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-5">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <IconKey className="w-5 h-5" />
                </div>
                <h2 className="font-bold text-[var(--ink)]">Generate API Key</h2>
              </div>
              <button onClick={close} className="text-zinc-400 hover:text-zinc-600 transition rounded-lg p-1 hover:bg-zinc-100">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {rawKey ? (
              /* Success state — show key once */
              <div className="space-y-4">
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Copy now — shown only once</p>
                  <p className="text-xs text-amber-600">This key will never be displayed again. Store it in a secure password manager.</p>
                </div>
                <div className="relative">
                  <code className="block w-full break-all rounded-xl bg-zinc-900 px-4 py-3 font-mono text-sm text-green-400">
                    {rawKey}
                  </code>
                  <button onClick={copyKey}
                    className={`absolute right-2 top-2 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      copied ? 'bg-green-500 text-white' : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
                    }`}>
                    {copied ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
                <button onClick={close}
                  className="w-full rounded-xl bg-[var(--brand)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-600)] transition">
                  Done — I've saved the key
                </button>
              </div>
            ) : (
              /* Form state */
              <form onSubmit={generate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Key Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required placeholder="e.g. Production Key" className="dev-input w-full" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Key Type</label>
                    <select value={form.key_type} onChange={e => setForm(f => ({ ...f, key_type: e.target.value }))}
                      className="dev-input w-full">
                      <option value="secret">Secret</option>
                      <option value="public">Public</option>
                      <option value="sandbox">Sandbox</option>
                      <option value="production">Production</option>
                      <option value="temporary">Temporary</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Environment</label>
                    <select value={form.environment} onChange={e => setForm(f => ({ ...f, environment: e.target.value }))}
                      className="dev-input w-full">
                      <option value="production">Production</option>
                      <option value="sandbox">Sandbox</option>
                      <option value="test">Test</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Scopes (comma-separated)</label>
                  <input value={form.scopes} onChange={e => setForm(f => ({ ...f, scopes: e.target.value }))}
                    placeholder="menu:read, loyalty:write, orders:read" className="dev-input w-full" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={close}
                    className="flex-1 rounded-xl border border-[var(--line)] py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving || !form.name}
                    className="flex-1 rounded-xl bg-[var(--brand)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-600)] disabled:opacity-60 transition">
                    {saving ? 'Generating…' : 'Generate Key'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .dev-input {
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
    </>
  )
}
