'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Toggle from '@/components/admin/kit/Toggle'
import Button from '@/components/admin/kit/Button'
import Field, { inputClass } from '@/components/admin/kit/Field'
import SetupCard from '@/components/admin/game/SetupCard'
import ConfirmDialog from '@/components/admin/kit/ConfirmDialog'
import { uploadImage, deleteImage } from '@/lib/storage'

interface Program {
  business_id: string
  active: boolean
  points_per_tnd: number
  welcome_points: number
  redeem_expiry_hours: number
}

interface Reward {
  id: string
  label: string
  points_cost: number
  active: boolean
  image_url?: string | null
}

/** POST a loyalty WRITE to the server route (server-side capability guard +
 *  service-role write, scoped to the session's business — no anon-client token). */
async function loyalty(action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch('/api/admin/loyalty', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, json }
}

/**
 * Owner configuration for the loyalty program. Operate (credit a purchase,
 * validate a reward code) lives in the Caisse console — this is setup:
 * activate, points rules, and the rewards catalogue.
 *
 * The `businessId` prop is kept for compatibility with the parent, but the
 * server route derives the business from the session, so it isn't sent on writes.
 */
export default function LoyaltyManager({ businessId: _businessId }: { businessId: string }) {
  const [program, setProgram] = useState<Program | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [pending, setPending] = useState(0)
  const [loading, setLoading] = useState(true)
  const [setupNeeded, setSetupNeeded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rewardToDelete, setRewardToDelete] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  // Reward NAME persists on a short debounce (not only on blur) so a typed name
  // is never lost if the owner switches tab or navigates before the input blurs.
  const labelTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/loyalty', { method: 'GET' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('LoyaltyManager load error:', json?.error)
      setError('Impossible de charger la fidélité. Réessayez.')
      setLoading(false)
      return
    }
    // Tables not installed yet → show the setup card (never surface SQL).
    if (json.provisioning) {
      setSetupNeeded(true)
      setLoading(false)
      return
    }
    const p = json.program as Program | null
    setProgram(p ? { ...p, redeem_expiry_hours: p.redeem_expiry_hours ?? 48 } : null)
    if (p) {
      setRewards(Array.isArray(json.rewards) ? json.rewards : [])
      setPending(typeof json.pending === 'number' ? json.pending : 0)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const PROVISION_MSG =
    "La fidélité n'est pas encore disponible sur votre compte. Réessayez dans un instant ou contactez le support si le problème persiste."
  const SAVE_MSG = 'Impossible d\'enregistrer. Réessayez.'

  async function createProgram() {
    setBusy(true)
    setError(null)
    const { ok, json } = await loyalty('createProgram')
    if (!ok || !json.ok) {
      if (json.provisioning || json.error === 'PROVISION') setError(PROVISION_MSG)
      else { console.error('LoyaltyManager createProgram error:', json?.error); setError(SAVE_MSG) }
    } else {
      setSetupNeeded(false)
      await load()
    }
    setBusy(false)
  }

  async function updateProgram(patch: Partial<Program>) {
    if (!program) return
    setProgram({ ...program, ...patch })
    const { ok, json } = await loyalty('updateProgram', { patch })
    if (!ok || !json.ok) {
      if (json.provisioning || json.error === 'PROVISION') setError(PROVISION_MSG)
      else { console.error('LoyaltyManager updateProgram error:', json?.error); setError(SAVE_MSG) }
    }
  }

  async function updateReward(id: string, patch: Partial<Reward>) {
    setRewards((cur) => cur.map((r) => (r.id === id ? { ...r, ...patch } : r)))
    const { ok, json } = await loyalty('updateReward', { id, patch })
    if (!ok || !json.ok) { console.error('LoyaltyManager updateReward error:', json?.error); setError(SAVE_MSG) }
  }

  function saveLabelDebounced(id: string, label: string) {
    clearTimeout(labelTimers.current[id])
    labelTimers.current[id] = setTimeout(() => updateReward(id, { label }), 600)
  }

  async function uploadRewardImage(id: string, file: File) {
    if (!file.type.startsWith('image/')) { setError('Choisissez un fichier image.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image trop lourde (max 5 Mo).'); return }
    setError(null)
    setUploadingId(id)
    const prev = rewards.find((r) => r.id === id)?.image_url || null
    try {
      const url = await uploadImage(file, `rewards/${id}`)
      await updateReward(id, { image_url: url })
      if (prev && prev !== url) { try { await deleteImage(prev) } catch {} }
    } catch (e: any) {
      setError(e.message || 'Échec du téléversement de l’image.')
    } finally {
      setUploadingId(null)
    }
  }

  async function removeRewardImage(id: string) {
    const prev = rewards.find((r) => r.id === id)?.image_url || null
    await updateReward(id, { image_url: null })
    if (prev) { try { await deleteImage(prev) } catch {} }
  }

  async function addReward() {
    const { ok, json } = await loyalty('addReward')
    if (!ok || !json.ok || !json.reward) { console.error('LoyaltyManager addReward error:', json?.error); setError(SAVE_MSG) }
    else setRewards((cur) => cur.concat(json.reward as Reward))
  }

  async function deleteReward(id: string) {
    const { ok, json } = await loyalty('deleteReward', { id })
    if (!ok || !json.ok) { console.error('LoyaltyManager deleteReward error:', json?.error); setError(SAVE_MSG) }
    else setRewards((cur) => cur.filter((r) => r.id !== id))
  }

  if (loading) return (
    <div className="space-y-4" aria-busy="true" aria-label="Chargement de la fidélité">
      <div className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2"><div className="h-4 w-40 rounded bg-zinc-200" /><div className="h-3 w-56 rounded bg-zinc-100" /></div>
          <div className="h-6 w-11 rounded-full bg-zinc-200" />
        </div>
        <div className="mt-4 h-[68px] rounded-xl bg-zinc-100" />
        <div className="mt-4 h-9 w-48 rounded-lg bg-zinc-100" />
      </div>
      <div className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="h-4 w-32 rounded bg-zinc-200" />
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-xl bg-zinc-100" />)}
        </div>
      </div>
    </div>
  )

  if (setupNeeded || !program) {
    return (
      <SetupCard
        icon={<span aria-hidden="true">★</span>}
        title="Points de fidélité"
        description="Vos clients gagnent des points à chaque achat (vous saisissez le montant en caisse) et les échangent contre des récompenses que vous définissez. Ils reviennent — encore et encore."
        cta="Activer la fidélité"
        onActivate={createProgram}
        busy={busy}
        error={error}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Status + rules */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <Toggle
          checked={program.active}
          onChange={(v) => updateProgram({ active: v })}
          label={program.active ? 'Programme actif' : 'Programme désactivé'}
          hint={program.active ? 'Vos clients voient leurs points sur /fidelite.' : 'Activez pour ouvrir la page fidélité.'}
        />
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50/60 px-4 py-3">
          <span aria-hidden="true" className="mt-0.5 text-base leading-none">🪙</span>
          <div>
            <p className="text-sm font-semibold text-zinc-900">1 dinar dépensé = 1 point</p>
            <p className="mt-0.5 text-xs text-zinc-500">Simple et clair pour vos clients. Les points se gagnent uniquement en caisse, sur le montant dépensé.</p>
          </div>
        </div>
        <div className="mt-4">
          <Field label="Points de bienvenue" hint="Offerts une seule fois, à la première visite du client. Mettez 0 pour désactiver.">
            <input
              type="number"
              min={0}
              step={1}
              value={program.welcome_points}
              onChange={(e) => updateProgram({ welcome_points: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
              className={`${inputClass} sm:max-w-xs`}
            />
          </Field>
        </div>
        {pending > 0 && (
          <div className="mt-4 text-xs text-zinc-400">{pending} récompense{pending > 1 ? 's' : ''} à remettre</div>
        )}
      </div>

      {/* Rewards */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-zinc-900">Récompenses</h4>
            <p className="text-xs text-zinc-400">Ce que vos clients peuvent obtenir avec leurs points.</p>
          </div>
          <Button variant="neutral" onClick={addReward} className="!min-h-0 px-3 py-2 text-xs">+ Récompense</Button>
        </div>
        <div className="mt-4 space-y-2">
          {rewards.map((r) => (
            <div key={r.id} className={`flex flex-wrap items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50/60 p-2.5 ${r.active ? '' : 'opacity-60'}`}>
              <div className="relative shrink-0">
                <label className="flex h-12 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white text-zinc-300 transition hover:border-orange-300" title="Image de la récompense">
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingId === r.id}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadRewardImage(r.id, f); e.currentTarget.value = '' }} />
                  {uploadingId === r.id ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-orange-500" />
                  ) : r.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                  )}
                </label>
                {r.image_url && uploadingId !== r.id && (
                  <button type="button" onClick={() => removeRewardImage(r.id)} aria-label="Retirer l’image"
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white shadow transition hover:bg-red-600">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
              <input
                value={r.label}
                onChange={(e) => { const v = e.target.value; setRewards((cur) => cur.map((x) => (x.id === r.id ? { ...x, label: v } : x))); saveLabelDebounced(r.id, v) }}
                onBlur={(e) => { clearTimeout(labelTimers.current[r.id]); updateReward(r.id, { label: e.target.value }) }}
                className={`${inputClass} min-w-0 flex-1`}
              />
              <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                Coût
                <input
                  type="number"
                  min={1}
                  value={r.points_cost}
                  onChange={(e) => updateReward(r.id, { points_cost: Math.max(1, Number(e.target.value)) })}
                  className="w-20 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/30"
                />
                pts
              </label>
              <button
                type="button"
                onClick={() => updateReward(r.id, { active: !r.active })}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${r.active ? 'bg-green-50 text-green-700' : 'bg-zinc-200 text-zinc-500'}`}
              >
                {r.active ? 'Active' : 'Inactive'}
              </button>
              <button type="button" onClick={() => setRewardToDelete(r.id)} aria-label="Supprimer la récompense" title="Supprimer" className="px-2 text-zinc-300 hover:text-red-500">✕</button>
            </div>
          ))}
          {rewards.length === 0 && <p className="py-6 text-center text-sm text-zinc-400">Aucune récompense.</p>}
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <ConfirmDialog
        open={!!rewardToDelete}
        title="Supprimer cette récompense ?"
        message="Vos clients ne pourront plus l'échanger. Action irréversible."
        confirmLabel="Supprimer"
        danger
        onConfirm={() => {
          const id = rewardToDelete
          setRewardToDelete(null)
          if (id) deleteReward(id)
        }}
        onCancel={() => setRewardToDelete(null)}
      />
    </div>
  )
}
