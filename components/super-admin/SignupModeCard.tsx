'use client'

import { useState } from 'react'
import { useToast } from './Toast'

/**
 * Super-admin control for how new establishments onboard:
 *  - OFF (default): visitors fill the public request form (/business-request),
 *    which lands in this Demandes queue; you create the account here.
 *  - ON: visitors can create their own account directly at /signup.
 * Toggling this flips both public entry pages (they cross-redirect on the
 * 'self_signup' platform setting), so the whole funnel follows one switch.
 */
export default function SignupModeCard({ initial }: { initial: boolean }) {
  const { toast } = useToast()
  const [enabled, setEnabled] = useState(initial)
  const [saving, setSaving] = useState(false)

  async function setMode(next: boolean) {
    if (saving || next === enabled) return
    const prev = enabled
    setEnabled(next) // optimistic
    setSaving(true)
    try {
      const res = await fetch('/api/super-admin/signup-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selfSignup: next }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Échec de l’enregistrement.')
      toast(next ? 'Inscription directe activée.' : 'Formulaire de demande requis.', 'success')
    } catch (e: any) {
      setEnabled(prev) // revert
      toast(e?.message || 'Une erreur est survenue.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900">Inscription des établissements</p>
          <p className="mt-1 text-sm text-zinc-500">
            {enabled
              ? 'Inscription directe : les visiteurs créent leur compte eux-mêmes sur /signup.'
              : 'Sur demande : les visiteurs remplissent le formulaire — vous créez les comptes ici.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Autoriser l’inscription directe"
          disabled={saving}
          onClick={() => setMode(!enabled)}
          className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
            enabled ? 'bg-orange-500' : 'bg-zinc-300'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  )
}
