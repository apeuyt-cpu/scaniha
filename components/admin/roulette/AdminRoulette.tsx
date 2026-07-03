'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import RouletteWheel from '@/components/game/RouletteWheel'
import Button from '@/components/admin/kit/Button'
import { inputClass } from '@/components/admin/kit/Field'
import ConfirmDialog from '@/components/admin/kit/ConfirmDialog'
import { useToast } from '@/components/admin/kit/Toast'
import { CardSkeleton } from '@/components/admin/kit/Skeleton'
import { splitInt } from '@/lib/game'
import RouletteSettings, { type RoulettePrize } from './RouletteSettings'

interface Win {
  id: string
  prize_label: string
  customer_phone: string
  customer_name: string | null
  code: string | null
  status: 'pending' | 'claimed' | 'cancelled'
  claimed_at: string | null
  created_at: string
}

interface SpinResult { prizeIndex: number; prizeId: string; prizeLabel: string }

/* Warm, on-brand palette (orange → amber) for the odds bar + per-lot dots. */
const PRIZE_COLORS = ['#F47B20', '#FB923C', '#F59E0B', '#FDBA74', '#FBBF24', '#EA580C', '#FCD34D', '#FED7AA']

async function api(action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch('/api/admin/roulette', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, json }
}

/**
 * The owner-operated roulette console. The owner spins the wheel at the counter,
 * a popup captures the customer's phone, and the prize is saved against that
 * number — then searchable + claimable below. Lots & odds are tuned in the
 * settings popup. Fully separate from the customer-facing game.
 */
export default function AdminRoulette() {
  const toast = useToast()
  const [prizes, setPrizes] = useState<RoulettePrize[]>([])
  const [stats, setStats] = useState({ pending: 0, claimedToday: 0 })
  const [loading, setLoading] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Spin state — mirrors the customer GameClient: spin asks the server for the
  // outcome, the wheel only animates to it, then we capture the phone on landing.
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'landed'>('idle')
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null)
  const [prizeToDelete, setPrizeToDelete] = useState<string | null>(null)

  // Debounced persistence (label typing + slider dragging), same model as GameManager.
  const labelTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const weightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingWeights = useRef<Map<string, number>>(new Map())
  // load() seeds default prizes on first visit — guard against StrictMode's
  // double-invoke (dev) so the defaults are never inserted twice.
  const didLoad = useRef(false)

  const load = useCallback(async () => {
    const { ok, json } = await api('load')
    if (ok) {
      setPrizes(json.prizes || [])
      setStats(json.stats || { pending: 0, claimedToday: 0 })
    }
    setLoading(false)
  }, [])

  useEffect(() => { if (didLoad.current) return; didLoad.current = true; load() }, [load])
  useEffect(() => () => { if (weightTimer.current) clearTimeout(weightTimer.current) }, [])

  async function persistPrize(id: string, patch: Partial<RoulettePrize>) {
    const { ok, json } = await api('updatePrize', { prizeId: id, patch })
    if (!ok) toast.error(json.error || 'Impossible d’enregistrer. Réessayez.')
  }

  function queueWeightSave(updates: Map<string, number>) {
    updates.forEach((w, id) => pendingWeights.current.set(id, w))
    if (weightTimer.current) clearTimeout(weightTimer.current)
    weightTimer.current = setTimeout(async () => {
      const entries = Array.from(pendingWeights.current.entries())
      pendingWeights.current.clear()
      for (const [id, w] of entries) await persistPrize(id, { weight: w })
    }, 450)
  }

  // Setting one lot to t% scales the OTHER active lots proportionally to fill the
  // remaining (100 − t)%, each keeping ≥1% — the total is always exactly 100.
  function setPct(id: string, target: number) {
    const active = prizes.filter((p) => p.active)
    if (active.length <= 1) return
    const others = active.filter((p) => p.id !== id)
    const t = Math.max(1, Math.min(100 - others.length, Math.round(target)))
    const otherInts = splitInt(others.map((p) => Math.max(0, p.weight || 0)), 100 - t, 1)
    const next = new Map<string, number>()
    next.set(id, t)
    others.forEach((p, i) => next.set(p.id, otherInts[i]))
    setPrizes((cur) => cur.map((p) => (next.has(p.id) ? { ...p, weight: next.get(p.id)! } : p)))
    queueWeightSave(next)
  }

  // Re-spread active weights to sum to 100 after the active set changes.
  async function renormalizeActive(list: RoulettePrize[]) {
    const active = list.filter((p) => p.active)
    if (active.length === 0) return
    const ints = splitInt(active.map((p) => Math.max(0, p.weight || 0)), 100, 1)
    const changed: [string, number][] = []
    active.forEach((p, i) => { if (ints[i] !== p.weight) changed.push([p.id, ints[i]]) })
    if (changed.length === 0) return
    setPrizes((cur) => cur.map((p) => {
      const c = changed.find(([cid]) => cid === p.id)
      return c ? { ...p, weight: c[1] } : p
    }))
    for (const [id, w] of changed) await persistPrize(id, { weight: w })
  }

  function togglePrizeActive(p: RoulettePrize) {
    const next = prizes.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x))
    setPrizes(next)
    persistPrize(p.id, { active: !p.active })
    renormalizeActive(next)
  }

  function onLabelInput(id: string, label: string) {
    setPrizes((cur) => cur.map((x) => (x.id === id ? { ...x, label } : x)))
    clearTimeout(labelTimers.current[id])
    labelTimers.current[id] = setTimeout(() => persistPrize(id, { label }), 600)
  }
  function onLabelBlur(id: string, label: string) {
    clearTimeout(labelTimers.current[id])
    persistPrize(id, { label })
  }

  async function addPrize() {
    const { ok, json } = await api('addPrize')
    if (!ok || !json.prize) { toast.error(json.error || 'Impossible d’ajouter le lot.'); return }
    const next = [...prizes, json.prize as RoulettePrize]
    setPrizes(next)
    renormalizeActive(next)
  }

  async function deletePrize(id: string) {
    const { ok, json } = await api('deletePrize', { prizeId: id })
    if (!ok) { toast.error(json.error || 'Impossible de supprimer le lot.'); return }
    const next = prizes.filter((p) => p.id !== id)
    setPrizes(next)
    renormalizeActive(next)
  }

  // ── Derived odds (active lots' shares, always summing to 100) ──────────
  const activeList = prizes.filter((p) => p.active)
  const activeLabels = activeList.map((p) => p.label || 'Lot')
  const activePcts = splitInt(activeList.map((p) => Math.max(0, p.weight || 0)), 100, activeList.length ? 1 : 0)
  const pctById: Record<string, number> = {}
  activeList.forEach((p, i) => { pctById[p.id] = activePcts[i] })
  const colorById: Record<string, string> = {}
  prizes.forEach((p, i) => { colorById[p.id] = PRIZE_COLORS[i % PRIZE_COLORS.length] })
  const sliderMax = Math.max(1, 100 - (activeList.length - 1))

  // ── Spin ───────────────────────────────────────────────────────────────
  async function spin() {
    if (phase === 'spinning') return
    if (activeList.length < 2) { toast.error('Ajoutez au moins 2 lots actifs pour tourner la roue.'); return }
    setSpinResult(null)
    setPhase('spinning')
    const { ok, json } = await api('spin')
    if (!ok || !json.ok) {
      setPhase('idle')
      toast.error(json.error === 'no_prizes' ? 'Aucun lot actif sur la roue.' : 'La roue n’a pas pu tourner. Réessayez.')
      return
    }
    setSpinResult({ prizeIndex: json.prizeIndex, prizeId: json.prizeId, prizeLabel: json.prizeLabel })
  }

  function resetSpin() {
    setPhase('idle')
    setSpinResult(null)
  }

  async function saveWin(phone: string, name: string) {
    if (!spinResult) return
    const { ok, json } = await api('saveWin', { prizeId: spinResult.prizeId, prizeLabel: spinResult.prizeLabel, phone, name })
    if (!ok || !json.ok) {
      toast.error(json.error || 'Impossible d’enregistrer le gain.')
      return
    }
    toast.success(`Gain « ${spinResult.prizeLabel} » enregistré pour ${phone}.`)
    setStats((s) => ({ ...s, pending: s.pending + 1 }))
    resetSpin()
  }

  if (loading) {
    return <CardSkeleton rows={5} />
  }

  return (
    <div className="space-y-4">
      {/* Counters */}
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Gains à remettre" value={stats.pending} />
        <StatTile label="Remis aujourd’hui" value={stats.claimedToday} />
      </div>

      {/* Wheel */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-zinc-900">Faites tourner la roue</h2>
            <p className="mt-0.5 text-xs text-zinc-400">Le client choisit, vous tournez — puis notez son numéro.</p>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            Lots &amp; chances
          </button>
        </div>

        {activeLabels.length < 2 ? (
          <div className="mt-5 rounded-xl bg-amber-50 px-4 py-6 text-center text-sm text-amber-700">
            Ajoutez au moins 2 lots actifs pour tourner la roue.
            <button type="button" onClick={() => setSettingsOpen(true)} className="mt-2 block w-full font-semibold text-amber-800 underline">
              Configurer les lots →
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5">
              <RouletteWheel
                prizes={activeLabels}
                spinning={phase === 'spinning' && spinResult !== null}
                targetIndex={spinResult ? spinResult.prizeIndex : null}
                onSpinEnd={() => { if (spinResult) setPhase('landed') }}
              />
            </div>
            <button
              type="button"
              onClick={spin}
              disabled={phase === 'spinning'}
              className="mt-5 block w-full rounded-2xl bg-orange-500 py-4 text-base font-semibold text-white transition hover:bg-orange-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {phase === 'spinning' ? 'La roue tourne…' : 'Tourner la roue'}
            </button>
          </>
        )}
      </div>

      {/* Search + claim */}
      <LookupCard
        onLookup={(phone) => api('lookup', { phone })}
        onSetStatus={async (winId, status) => {
          const { ok, json } = await api('setWinStatus', { winId, status })
          if (!ok) { toast.error(json.error || 'Action impossible.'); return false }
          setStats((s) => ({
            pending: Math.max(0, s.pending + (status === 'pending' ? 1 : -1)),
            claimedToday: status === 'claimed' ? s.claimedToday + 1 : s.claimedToday,
          }))
          toast.success(status === 'claimed' ? 'Gain remis au client.' : status === 'cancelled' ? 'Gain annulé.' : 'Gain rouvert.')
          return true
        }}
      />

      {/* Post-spin phone capture */}
      {phase === 'landed' && spinResult && (
        <PhonePrompt
          prizeLabel={spinResult.prizeLabel}
          onSave={saveWin}
          onCancel={resetSpin}
        />
      )}

      {/* Settings popup — lots & odds */}
      <RouletteSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        prizes={prizes}
        pctById={pctById}
        colorById={colorById}
        sliderMax={sliderMax}
        activeCount={activeList.length}
        onAdd={addPrize}
        onLabelInput={onLabelInput}
        onLabelBlur={onLabelBlur}
        onSetPct={setPct}
        onToggle={togglePrizeActive}
        onDelete={(id) => setPrizeToDelete(id)}
      />

      <ConfirmDialog
        open={!!prizeToDelete}
        title="Supprimer ce lot ?"
        message="Ce lot ne sera plus proposé sur la roue. Action irréversible."
        confirmLabel="Supprimer"
        danger
        onConfirm={() => { const id = prizeToDelete; setPrizeToDelete(null); if (id) deletePrize(id) }}
        onCancel={() => setPrizeToDelete(null)}
      />
    </div>
  )
}

/* ── Counter tile ─────────────────────────────────────────────────────── */
function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center">
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-zinc-500">{label}</p>
    </div>
  )
}

/* ── Post-spin phone capture popup ────────────────────────────────────── */
function PhonePrompt({ prizeLabel, onSave, onCancel }: { prizeLabel: string; onSave: (phone: string, name: string) => void | Promise<void>; onCancel: () => void }) {
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+216')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [onCancel])

  async function submit() {
    if (phone.replace(/[^\d]/g, '').length < 8) return
    setBusy(true)
    const fullPhone = phone.trim().startsWith('+') ? phone.trim() : countryCode + phone.trim().replace(/^0/, '')
    await onSave(fullPhone, name.trim())
    setBusy(false)
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Enregistrer le gain"
        className="w-full max-w-sm rounded-t-3xl bg-white px-6 pb-7 pt-8 text-center shadow-xl animate-[winpop_.3s_cubic-bezier(0.16,0.84,0.3,1)] sm:rounded-3xl"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-3xl" aria-hidden="true">🎉</div>
        <h2 className="mt-3 text-xl font-bold text-zinc-900">Le client a gagné&nbsp;!</h2>
        <p className="mt-1 text-lg font-semibold text-orange-600">{prizeLabel}</p>
        <p className="mt-2 text-sm text-zinc-500">Enregistrez son numéro pour qu’il récupère son lot plus tard.</p>

        <div className="mt-5 space-y-3 text-left">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Téléphone du client</label>
            <div className="flex overflow-hidden rounded-xl border border-zinc-200 bg-white focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100">
              <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} aria-label="Indicatif" className="border-r border-zinc-200 bg-zinc-50 px-2 py-2.5 text-sm font-medium text-zinc-700 focus:outline-none">
                <option value="+216">🇹🇳 +216</option>
                <option value="+213">🇩🇿 +213</option>
                <option value="+212">🇲🇦 +212</option>
                <option value="+218">🇱🇾 +218</option>
                <option value="+33">🇫🇷 +33</option>
                <option value="+32">🇧🇪 +32</option>
                <option value="+41">🇨🇭 +41</option>
                <option value="+49">🇩🇪 +49</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+39">🇮🇹 +39</option>
                <option value="+34">🇪🇸 +34</option>
                <option value="+971">🇦🇪 +971</option>
                <option value="+966">🇸🇦 +966</option>
                <option value="+974">🇶🇦 +974</option>
              </select>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="12 345 678" inputMode="tel" autoFocus className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Nom <span className="font-normal text-zinc-400">(optionnel)</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Prénom"
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={submit}
            disabled={busy || phone.replace(/[^\d]/g, '').length < 8}
            className="rounded-2xl bg-orange-500 py-3.5 text-sm font-semibold text-white transition hover:bg-orange-600 active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? 'Enregistrement…' : 'Enregistrer le gain'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-zinc-200 bg-white py-3.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            Annuler
          </button>
        </div>

        <style jsx global>{`
          @keyframes winpop { from { opacity: 0; transform: translateY(28px) scale(0.96) } to { opacity: 1; transform: translateY(0) scale(1) } }
        `}</style>
      </div>
    </div>
  )
}

/* ── Search a phone + claim its prizes ────────────────────────────────── */
function fmt(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function LookupCard({
  onLookup,
  onSetStatus,
}: {
  onLookup: (phone: string) => Promise<{ ok: boolean; json: any }>
  onSetStatus: (winId: string, status: 'claimed' | 'cancelled' | 'pending') => Promise<boolean>
}) {
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+216')
  const [busy, setBusy] = useState(false)
  const [wins, setWins] = useState<Win[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  async function search() {
    if (!phone.trim()) return
    const fullPhone = phone.trim().startsWith('+') ? phone.trim() : countryCode + phone.trim().replace(/^0/, '')
    setBusy(true)
    setErr(null)
    setWins(null)
    const { ok, json } = await onLookup(fullPhone)
    setBusy(false)
    if (!ok) { setErr(json.error || 'Erreur.'); return }
    setWins(json.wins || [])
  }

  async function setStatus(winId: string, status: 'claimed' | 'cancelled' | 'pending') {
    setActing(winId)
    const ok = await onSetStatus(winId, status)
    setActing(null)
    if (ok) setWins((cur) => cur?.map((w) => (w.id === winId ? { ...w, status, claimed_at: status === 'claimed' ? new Date().toISOString() : null } : w)) ?? null)
  }

  const pending = wins?.filter((w) => w.status === 'pending') ?? []
  const past = wins?.filter((w) => w.status !== 'pending') ?? []

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="font-bold text-zinc-900">Rechercher un gain</h2>
      <p className="mt-0.5 text-sm text-zinc-500">Entrez le numéro du client pour retrouver ses lots et les remettre.</p>
      <div className="mt-4 flex gap-2">
        <div className="flex flex-1 overflow-hidden rounded-xl border border-zinc-200 bg-white focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100">
          <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} aria-label="Indicatif" className="border-r border-zinc-200 bg-zinc-50 px-2 py-2.5 text-sm font-medium text-zinc-700 focus:outline-none">
            <option value="+216">🇹🇳 +216</option>
            <option value="+213">🇩🇿 +213</option>
            <option value="+212">🇲🇦 +212</option>
            <option value="+218">🇱🇾 +218</option>
            <option value="+33">🇫🇷 +33</option>
            <option value="+32">🇧🇪 +32</option>
            <option value="+41">🇨🇭 +41</option>
            <option value="+49">🇩🇪 +49</option>
            <option value="+44">🇬🇧 +44</option>
            <option value="+1">🇺🇸 +1</option>
            <option value="+39">🇮🇹 +39</option>
            <option value="+34">🇪🇸 +34</option>
            <option value="+971">🇦🇪 +971</option>
            <option value="+966">🇸🇦 +966</option>
            <option value="+974">🇶🇦 +974</option>
          </select>
          <input value={phone} onChange={(e) => { setPhone(e.target.value); setWins(null); setErr(null) }} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="12 345 678" inputMode="tel" className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm focus:outline-none" />
        </div>
        <Button variant="neutral" onClick={search} disabled={busy || !phone.trim()} className="shrink-0">
          {busy ? '…' : 'Chercher'}
        </Button>
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      {wins && (
        <div className="mt-4 space-y-4">
          {pending.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">À remettre</h3>
              <div className="mt-2 space-y-2">
                {pending.map((w) => (
                  <div key={w.id} className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-zinc-900">{w.prize_label}</p>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          {w.customer_name ? `${w.customer_name} · ` : ''}{fmt(w.created_at)}
                          {w.code ? <span className="ml-1.5 rounded bg-zinc-100 px-1.5 py-0.5 font-mono tracking-wider text-zinc-500">{w.code}</span> : null}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setStatus(w.id, 'claimed')}
                        disabled={acting === w.id}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-green-700 active:scale-[0.99] disabled:opacity-60"
                      >
                        ✓ Remis
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus(w.id, 'cancelled')}
                        disabled={acting === w.id}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-500 transition hover:bg-zinc-50 disabled:opacity-60"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Historique</h3>
              <div className="mt-2 space-y-1.5">
                {past.map((w) => (
                  <div key={w.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-zinc-600">
                      {w.prize_label}
                      <span className="ml-1.5 text-xs text-zinc-300">{fmt(w.claimed_at || w.created_at)}</span>
                    </span>
                    <span className={`shrink-0 text-xs font-semibold ${w.status === 'claimed' ? 'text-green-600' : 'text-zinc-400'}`}>
                      {w.status === 'claimed' ? 'Remis' : 'Annulé'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {wins.length === 0 && <p className="text-sm text-zinc-400">Aucun gain pour ce numéro.</p>}
        </div>
      )}
    </div>
  )
}
