'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/admin/ui/Button'
import Field, { inputClass } from '@/components/admin/ui/Field'
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog'
import { useToast } from '@/components/admin/ui/Toast'
import type { ApiKeyPublic } from '@/lib/api/keys'

/** A freshly-minted key, shown exactly once. */
interface CreatedKey {
  id: string
  raw: string
  key_prefix: string
  name: string
  created_at: string
}

function fmt(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/**
 * Owner-facing management of the public Loyalty API keys.
 * Calls the session-authed /api/admin/api-keys route (legacy { error } shape).
 * The raw key is shown ONCE on creation with a copy affordance + a clear
 * "copiez-la maintenant" warning. Revocation goes through a danger ConfirmDialog.
 */
export default function ApiKeyManager() {
  const toast = useToast()
  const [keys, setKeys] = useState<ApiKeyPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<CreatedKey | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [revoking, setRevoking] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/api-keys')
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setKeys(Array.isArray(json.keys) ? json.keys : [])
      } else {
        toast.error(json.error || 'Impossible de charger les clés.')
      }
    } catch {
      toast.error('Impossible de charger les clés.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  async function create() {
    setCreating(true)
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || 'Clé API' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json.error || 'Création impossible.')
        return
      }
      setCreated(json as CreatedKey)
      setCopied(false)
      setName('')
      toast.success('Clé créée. Copiez-la maintenant.')
      load()
    } catch {
      toast.error('Création impossible.')
    } finally {
      setCreating(false)
    }
  }

  async function copyRaw() {
    if (!created) return
    try {
      await navigator.clipboard.writeText(created.raw)
      setCopied(true)
      toast.success('Clé copiée.')
    } catch {
      toast.error('Copie impossible — sélectionnez et copiez manuellement.')
    }
  }

  async function revoke() {
    if (!confirmId) return
    setRevoking(true)
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json.error || 'Révocation impossible.')
        return
      }
      toast.success('Clé révoquée.')
      load()
    } catch {
      toast.error('Révocation impossible.')
    } finally {
      setRevoking(false)
      setConfirmId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* One-time reveal of a freshly-created key */}
      {created && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 text-orange-500" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-zinc-900">Copiez votre clé maintenant</p>
              <p className="mt-0.5 text-sm text-zinc-600">
                Cette clé ne sera plus jamais affichée. Conservez-la dans un endroit sûr et côté serveur uniquement.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 font-mono text-sm text-zinc-900">
                  {created.raw}
                </code>
                <Button variant="primary" onClick={copyRaw} className="shrink-0">
                  {copied ? '✓ Copiée' : 'Copier'}
                </Button>
              </div>
              <button
                type="button"
                onClick={() => setCreated(null)}
                className="mt-3 text-sm font-semibold text-zinc-600 transition hover:text-zinc-900"
              >
                J’ai copié ma clé
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create a new key */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="font-bold text-zinc-900">Nouvelle clé API</h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          Donnez un nom reconnaissable (ex. « Caisse principale ») pour la retrouver plus tard.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Nom de la clé" htmlFor="key-name">
              <input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !creating && create()}
                placeholder="Caisse principale"
                maxLength={60}
                autoComplete="off"
                className={inputClass}
              />
            </Field>
          </div>
          <Button variant="primary" onClick={create} disabled={creating} className="sm:mb-0">
            {creating ? '…' : 'Créer la clé'}
          </Button>
        </div>
      </div>

      {/* Existing keys */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="font-bold text-zinc-900">Vos clés</h2>

        {loading ? (
          <p className="mt-4 text-sm text-zinc-400">Chargement…</p>
        ) : keys.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">Aucune clé pour le moment. Créez-en une ci-dessus.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {keys.map((k) => {
              const revoked = !!k.revoked_at
              const lastUsed = fmt(k.last_used_at)
              return (
                <li
                  key={k.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                    revoked ? 'border-zinc-100 bg-zinc-50/60' : 'border-zinc-200'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`font-semibold ${revoked ? 'text-zinc-400' : 'text-zinc-900'}`}>{k.name}</span>
                      <code className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-500">{k.key_prefix}…</code>
                      {revoked && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">Révoquée</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {revoked
                        ? `Révoquée le ${fmt(k.revoked_at)}`
                        : lastUsed
                          ? `Dernière utilisation : ${lastUsed}`
                          : 'Jamais utilisée'}
                    </p>
                  </div>
                  {!revoked && (
                    <button
                      type="button"
                      onClick={() => setConfirmId(k.id)}
                      className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      Révoquer
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <p className="mt-5 text-xs text-zinc-400">
          Besoin d’aide pour l’intégration ?{' '}
          <Link href="/developers" className="font-semibold text-orange-600 hover:underline">
            Documentation développeurs →
          </Link>
        </p>
      </div>

      <ConfirmDialog
        open={confirmId !== null}
        danger
        title="Révoquer cette clé ?"
        message="Toute intégration qui l’utilise cessera immédiatement de fonctionner. Cette action est irréversible."
        confirmLabel={revoking ? 'Révocation…' : 'Révoquer'}
        cancelLabel="Annuler"
        onConfirm={revoke}
        onCancel={() => !revoking && setConfirmId(null)}
      />
    </div>
  )
}
