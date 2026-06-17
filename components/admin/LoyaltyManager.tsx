'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Toggle from '@/components/admin/ui/Toggle'
import Button from '@/components/admin/ui/Button'
import Field, { inputClass } from '@/components/admin/ui/Field'
import SetupCard from '@/components/admin/game/SetupCard'
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog'

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
}

/**
 * Owner configuration for the loyalty program. Operate (credit a purchase,
 * validate a reward code) lives in the Caisse console — this is setup:
 * activate, points rules, and the rewards catalogue.
 */
export default function LoyaltyManager({ businessId }: { businessId: string }) {
  const supabase = createClient()
  const [program, setProgram] = useState<Program | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [pending, setPending] = useState(0)
  const [loading, setLoading] = useState(true)
  const [setupNeeded, setSetupNeeded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rewardToDelete, setRewardToDelete] = useState<string | null>(null)
  // Reward NAME persists on a short debounce (not only on blur) so a typed name
  // is never lost if the owner switches tab or navigates before the input blurs.
  const labelTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const load = useCallback(async () => {
    const { data: p, error: pErr } = await (supabase.from('loyalty_programs') as any)
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle()
    if (pErr) {
      if (pErr.code === '42P01' || pErr.message?.includes('does not exist') || pErr.message?.includes('schema cache')) {
        setSetupNeeded(true)
      } else { console.error('LoyaltyManager load error:', pErr); setError('Impossible de charger la fidélité. Réessayez.') }
      setLoading(false)
      return
    }
    // Loyalty is intentionally simple: 1 dinar spent = 1 point, everywhere.
    // The owner no longer tunes a ratio, so self-heal any legacy non-1 value.
    if (p && Number(p.points_per_tnd) !== 1) {
      ;(supabase.from('loyalty_programs') as any).update({ points_per_tnd: 1 }).eq('business_id', businessId)
      p.points_per_tnd = 1
    }
    setProgram(p ? { redeem_expiry_hours: 48, ...p } : null)
    if (p) {
      const now = new Date().toISOString()
      const [{ data: r }, pend] = await Promise.all([
        (supabase.from('loyalty_rewards') as any).select('*').eq('business_id', businessId).order('points_cost'),
        (supabase.from('loyalty_redemptions') as any)
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .eq('status', 'pending')
          .gt('expires_at', now),
      ])
      setRewards(r || [])
      setPending(pend.count ?? 0)
    }
    setLoading(false)
  }, [businessId, supabase])

  useEffect(() => {
    load()
  }, [load])

  // True when the backend isn't able to provision the feature yet (tables not
  // installed). We never show SQL to the owner — just a clear French message.
  function isProvisioningError(err: any) {
    return (
      err?.code === '42P01' ||
      err?.message?.includes('does not exist') ||
      err?.message?.includes('schema cache')
    )
  }
  const PROVISION_MSG =
    "La fidélité n'est pas encore disponible sur votre compte. Réessayez dans un instant ou contactez le support si le problème persiste."
  const SAVE_MSG = 'Impossible d\'enregistrer. Réessayez.'

  async function createProgram() {
    setBusy(true)
    setError(null)
    const { error: e } = await (supabase.from('loyalty_programs') as any).insert({ business_id: businessId, active: false })
    if (e) {
      if (isProvisioningError(e)) setError(PROVISION_MSG)
      else { console.error('LoyaltyManager createProgram error:', e); setError(SAVE_MSG) }
    } else {
      const defaults = [
        { business_id: businessId, label: 'Café offert', points_cost: 50 },
        { business_id: businessId, label: 'Dessert offert', points_cost: 100 },
        { business_id: businessId, label: '-20% sur l’addition', points_cost: 200 },
      ]
      await (supabase.from('loyalty_rewards') as any).insert(defaults)
      setSetupNeeded(false)
      await load()
    }
    setBusy(false)
  }

  async function updateProgram(patch: Partial<Program>) {
    if (!program) return
    setProgram({ ...program, ...patch })
    const { error: e } = await (supabase.from('loyalty_programs') as any).update(patch).eq('business_id', businessId)
    if (e) { console.error('LoyaltyManager updateProgram error:', e); setError(SAVE_MSG) }
  }

  async function updateReward(id: string, patch: Partial<Reward>) {
    setRewards((cur) => cur.map((r) => (r.id === id ? { ...r, ...patch } : r)))
    const { error: e } = await (supabase.from('loyalty_rewards') as any).update(patch).eq('id', id)
    if (e) { console.error('LoyaltyManager updateReward error:', e); setError(SAVE_MSG) }
  }

  function saveLabelDebounced(id: string, label: string) {
    clearTimeout(labelTimers.current[id])
    labelTimers.current[id] = setTimeout(() => updateReward(id, { label }), 600)
  }

  async function addReward() {
    const { data, error: e } = await (supabase.from('loyalty_rewards') as any)
      .insert({ business_id: businessId, label: 'Nouvelle récompense', points_cost: 100 })
      .select('*')
      .single()
    if (e) { console.error('LoyaltyManager addReward error:', e); setError(SAVE_MSG) }
    else setRewards((cur) => [...cur, data])
  }

  async function deleteReward(id: string) {
    const { error: e } = await (supabase.from('loyalty_rewards') as any).delete().eq('id', id)
    if (e) { console.error('LoyaltyManager deleteReward error:', e); setError(SAVE_MSG) }
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
