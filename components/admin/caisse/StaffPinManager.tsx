'use client'

import { useCallback, useEffect, useState } from 'react'
import Button from '@/components/admin/ui/Button'
import Field, { inputClass } from '@/components/admin/ui/Field'
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog'
import { useToast } from '@/components/admin/ui/Toast'
import { Skeleton } from '@/components/admin/ui/Skeleton'
import type { StaffPinPublic } from '@/lib/db/staff-pins'

function fmt(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/**
 * Owner-facing management of the caisse staff PINs (opt-in).
 * Calls the session-authed /api/admin/staff-pins route (legacy { error } shape).
 * The raw PIN is sent on create and NEVER returned — only the public row. While
 * no PIN exists, the caisse works without one (backward-compatible). Deactivation
 * goes through a danger ConfirmDialog.
 */
export default function StaffPinManager() {
  const toast = useToast()
  const [pins, setPins] = useState<StaffPinPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [label, setLabel] = useState('')
  const [pin, setPin] = useState('')
  const [creating, setCreating] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deactivating, setDeactivating] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/staff-pins')
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setPins(Array.isArray(json.pins) ? json.pins : [])
      } else {
        toast.error(json.error || 'Impossible de charger les codes PIN.')
      }
    } catch {
      toast.error('Impossible de charger les codes PIN.')
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
      const res = await fetch('/api/admin/staff-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim(), pin }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json.error || 'Ajout impossible.')
        return
      }
      toast.success('Code PIN ajouté.')
      setLabel('')
      setPin('')
      load()
    } catch {
      toast.error('Ajout impossible.')
    } finally {
      setCreating(false)
    }
  }

  async function deactivate() {
    if (!confirmId) return
    setDeactivating(true)
    try {
      const res = await fetch('/api/admin/staff-pins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json.error || 'Désactivation impossible.')
        return
      }
      toast.success('Code PIN désactivé.')
      load()
    } catch {
      toast.error('Désactivation impossible.')
    } finally {
      setDeactivating(false)
      setConfirmId(null)
    }
  }

  return (
    <div className="space-y-6">
      <p className="max-w-prose text-sm leading-relaxed text-zinc-500">
        Ajoutez un code PIN par membre du personnel. Tant qu’aucun code n’existe, la caisse fonctionne sans PIN.
      </p>

      {/* Add a PIN */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="font-bold text-zinc-900">Ajouter un code PIN</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Nom (ex. Sarah / Comptoir)" htmlFor="pin-label">
              <input
                id="pin-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Sarah"
                maxLength={40}
                autoComplete="off"
                className={inputClass}
              />
            </Field>
          </div>
          <div className="sm:w-44">
            <Field label="Code PIN (4 à 6 chiffres)" htmlFor="pin-code">
              <input
                id="pin-code"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && !creating && create()}
                placeholder="••••"
                autoComplete="off"
                className={inputClass}
              />
            </Field>
          </div>
          <Button variant="primary" onClick={create} disabled={creating} className="sm:mb-0">
            {creating ? '…' : 'Ajouter'}
          </Button>
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          Le code est enregistré de façon sécurisée et ne sera plus affiché.
        </p>
      </div>

      {/* Active PINs */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="font-bold text-zinc-900">Codes PIN actifs</h2>

        {loading ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        ) : pins.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">Aucun code PIN. La caisse reste accessible sans code.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {pins.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3"
              >
                <div className="min-w-0">
                  <span className="font-semibold text-zinc-900">{p.label}</span>
                  <p className="mt-0.5 text-xs text-zinc-400">Ajouté le {fmt(p.created_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmId(p.id)}
                  className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                >
                  Désactiver
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirmId !== null}
        danger
        title="Désactiver ce code PIN ?"
        message="Le membre ne pourra plus créditer d’achats avec ce code."
        confirmLabel={deactivating ? 'Désactivation…' : 'Désactiver'}
        cancelLabel="Annuler"
        onConfirm={deactivate}
        onCancel={() => !deactivating && setConfirmId(null)}
      />
    </div>
  )
}
