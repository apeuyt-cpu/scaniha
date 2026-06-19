'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { type PrizeRow, splitInt } from '@/lib/game'
import { useRoueGame } from '@/components/admin/fidelite/useRoueGame'
import Toggle from '@/components/admin/ui/Toggle'
import Button from '@/components/admin/ui/Button'
import { inputClass } from '@/components/admin/ui/Field'
import SetupCard from '@/components/admin/game/SetupCard'
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog'
import { CardSkeleton } from '@/components/admin/ui/Skeleton'

/**
 * Owner configuration for the roulette ("everyone wins, variable value").
 * This screen stays deliberately simple: activate, prizes (name + chance), and a
 * live preview. Everything else — play limits, cost/stock, conditions, QR lock —
 * lives on the separate "Réglages avancés" page so first setup never feels heavy.
 */
export default function GameManager({ businessId, slug }: { businessId: string; slug: string }) {
  const {
    game, prizes, setPrizes, stats, loading, setupNeeded, error, setError,
    gameApi, createGame, updateGame, updatePrize, persistPrize,
  } = useRoueGame(businessId)

  const [busy, setBusy] = useState(false)
  const [prizeToDelete, setPrizeToDelete] = useState<string | null>(null)
  // Prize NAME persists on a short debounce (not only on blur) so a typed name is
  // never lost if the owner switches tab or navigates before the input blurs.
  const labelTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  // Slider odds persist on a short debounce so dragging stays smooth (one write
  // per settle, not one per pixel). pendingWeights collects the final value per lot.
  const weightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingWeights = useRef<Map<string, number>>(new Map())

  // Drop the pending timer on unmount to avoid a late setState.
  useEffect(() => () => { if (weightTimer.current) clearTimeout(weightTimer.current) }, [])

  async function handleCreate() {
    setBusy(true)
    await createGame()
    setBusy(false)
  }

  // Debounced batch-save of slider weights: drag updates state instantly, the DB
  // write fires ~450ms after the owner stops moving the slider.
  function queueWeightSave(updates: Map<string, number>) {
    updates.forEach((w, id) => pendingWeights.current.set(id, w))
    if (weightTimer.current) clearTimeout(weightTimer.current)
    weightTimer.current = setTimeout(async () => {
      const entries = Array.from(pendingWeights.current.entries())
      pendingWeights.current.clear()
      for (const [id, w] of entries) await persistPrize(id, { weight: w })
    }, 450)
  }

  // The odds are stored as weights that sum to 100, so weight reads as "% of spins".
  // Setting one lot to t% scales the OTHER active lots proportionally to fill the
  // remaining (100 − t)%, each keeping at least 1% — the total is always exactly 100.
  function setPct(id: string, target: number) {
    const active = prizes.filter((p) => p.active)
    if (active.length <= 1) return // a single active lot is pinned at 100%
    const others = active.filter((p) => p.id !== id)
    const t = Math.max(1, Math.min(100 - others.length, Math.round(target)))
    const otherInts = splitInt(others.map((p) => Math.max(0, p.weight || 0)), 100 - t, 1)
    const next = new Map<string, number>()
    next.set(id, t)
    others.forEach((p, i) => next.set(p.id, otherInts[i]))
    setPrizes((cur) => cur.map((p) => (next.has(p.id) ? { ...p, weight: next.get(p.id)! } : p)))
    queueWeightSave(next)
  }

  // Re-spread the active lots' weights to sum to 100 after the active set changes
  // (add / delete / activate / deactivate). Keeps the slider %s honest and ensures
  // every active lot stays winnable (weight ≥ 1).
  async function renormalizeActive(list: PrizeRow[]) {
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

  function togglePrizeActive(p: PrizeRow) {
    const next = prizes.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x))
    setPrizes(next)
    persistPrize(p.id, { active: !p.active })
    renormalizeActive(next)
  }

  function saveLabelDebounced(id: string, label: string) {
    clearTimeout(labelTimers.current[id])
    labelTimers.current[id] = setTimeout(() => updatePrize(id, { label }), 600)
  }

  async function addPrize() {
    if (!game) return
    const { ok, json } = await gameApi('addPrize', { gameId: game.id, position: prizes.length })
    if (!ok || !json.prize) { console.error('GameManager addPrize error:', json.error); setError(json.error || 'Impossible d\'enregistrer. Réessayez.'); return }
    const next = [...prizes, json.prize as PrizeRow]
    setPrizes(next)
    renormalizeActive(next) // give the new lot a fair share, keep the total at 100%
  }

  async function deletePrize(id: string) {
    const { ok, json } = await gameApi('deletePrize', { prizeId: id })
    if (!ok) { console.error('GameManager deletePrize error:', json.error); setError(json.error || 'Impossible d\'enregistrer. Réessayez.'); return }
    const next = prizes.filter((p) => p.id !== id)
    setPrizes(next)
    renormalizeActive(next) // re-spread the freed-up odds across the remaining lots
  }

  if (loading) {
    return <CardSkeleton rows={4} />
  }

  if (setupNeeded || !game) {
    return (
      <SetupCard
        icon={<span aria-hidden="true">🎡</span>}
        title="Roue de la chance"
        description="Vos clients scannent, tournent la roue et gagnent toujours quelque chose — vous contrôlez les lots et leur fréquence. Un aimant à fidélité pour votre établissement."
        cta="Configurer ma roue"
        onActivate={handleCreate}
        busy={busy}
        error={error}
      />
    )
  }

  // Display odds: each active lot's share rounded to whole %s that ALWAYS sum to
  // 100 (largest-remainder), so the live bar and the readouts never lie by ±1.
  const activeList = prizes.filter((p) => p.active)
  const activePcts = splitInt(activeList.map((p) => Math.max(0, p.weight || 0)), 100, activeList.length ? 1 : 0)
  const pctById: Record<string, number> = {}
  activeList.forEach((p, i) => { pctById[p.id] = activePcts[i] })
  const activePrizes = activeList.length
  // A lot can take at most this %, leaving every other active lot at least 1%.
  const sliderMax = Math.max(1, 100 - (activeList.length - 1))
  // Stable warm colour per lot (by row order) — shared by the live bar and dots.
  const colorById: Record<string, string> = {}
  prizes.forEach((p, i) => { colorById[p.id] = PRIZE_COLORS[i % PRIZE_COLORS.length] })

  return (
    <div className="space-y-4">
      {/* Status + activation */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <Toggle
          checked={game.active}
          onChange={(v) => updateGame({ active: v })}
          label={game.active ? 'Roue active' : 'Roue désactivée'}
          hint={game.active ? 'Le bouton « Tentez votre chance » apparaît sur votre menu.' : 'Activez pour afficher la roue sur votre menu.'}
        />
        {game.active && activePrizes < 2 && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Ajoutez au moins 2 lots actifs pour que la roue s&apos;affiche.
          </p>
        )}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Parties aujourd’hui" value={stats.plays} />
          <Stat label="Gains à remettre" value={stats.pending} />
          <Stat label="Remis aujourd’hui" value={stats.redeemed} />
        </div>
        {game.active && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <a href={`/${slug}/jeu`} target="_blank" className="font-semibold text-zinc-500 hover:text-zinc-700">Voir la page du jeu ↗</a>
          </div>
        )}
      </div>

      {/* Prizes */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-zinc-900">Lots de la roue</h4>
            <p className="mt-0.5 text-xs text-zinc-400">
              Glissez pour régler la chance de chaque lot — le total reste toujours à 100&nbsp;%.
            </p>
          </div>
          <Button variant="neutral" onClick={addPrize} className="!min-h-0 shrink-0 px-3 py-2 text-xs">+ Lot</Button>
        </div>

        {/* Live odds bar — each active lot's share at a glance; the per-row dots are its legend */}
        {activeList.length > 0 && (
          <div className="mt-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100">
              {activeList.map((p) => (
                <div
                  key={p.id}
                  className="h-full transition-[width] duration-150"
                  style={{ width: `${pctById[p.id]}%`, backgroundColor: colorById[p.id], boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.65)' }}
                  title={`${p.label || 'Lot'} · ${pctById[p.id]}%`}
                />
              ))}
            </div>
            <p className="mt-2 text-center text-[11px] text-zinc-400">Tout le monde gagne — les chances font toujours 100&nbsp;%.</p>
          </div>
        )}

        <div className="mt-4 space-y-2.5">
          {prizes.map((p) => (
            <div key={p.id} className={`rounded-xl border border-zinc-200 bg-white p-3.5 transition ${p.active ? '' : 'opacity-70'}`}>
              {/* Row 1: colour dot · name · delete */}
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: p.active ? colorById[p.id] : '#D4D4D8' }}
                  aria-hidden="true"
                />
                <input
                  value={p.label}
                  onChange={(e) => { const v = e.target.value; setPrizes((cur) => cur.map((x) => (x.id === p.id ? { ...x, label: v } : x))); saveLabelDebounced(p.id, v) }}
                  onBlur={(e) => { clearTimeout(labelTimers.current[p.id]); updatePrize(p.id, { label: e.target.value }) }}
                  className={`${inputClass} min-w-0 flex-1`}
                  placeholder="Nom du lot"
                />
                <button
                  type="button"
                  onClick={() => setPrizeToDelete(p.id)}
                  aria-label="Supprimer le lot"
                  title="Supprimer"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" /></svg>
                </button>
              </div>
              {/* Row 2: active toggle + chance slider — moving one auto-balances the rest to 100% */}
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => togglePrizeActive(p)}
                  aria-pressed={p.active}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${p.active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                >
                  {p.active ? 'Actif' : 'Inactif'}
                </button>
                {p.active ? (
                  <>
                    <input
                      type="range"
                      min={1}
                      max={sliderMax}
                      step={1}
                      value={pctById[p.id] ?? 0}
                      disabled={activeList.length <= 1}
                      onChange={(e) => setPct(p.id, Number(e.target.value))}
                      aria-label={`Chance de gagner « ${p.label || 'lot'} »`}
                      className="h-6 flex-1 cursor-pointer accent-orange-500 disabled:cursor-default disabled:opacity-50"
                    />
                    <span className="w-12 shrink-0 text-right text-base font-bold tabular-nums" style={{ color: colorById[p.id] }}>
                      {pctById[p.id] ?? 0}%
                    </span>
                  </>
                ) : (
                  <span className="text-[11px] text-zinc-400">N&apos;apparaît pas sur la roue.</span>
                )}
              </div>
            </div>
          ))}
          {prizes.length === 0 && <p className="py-6 text-center text-sm text-zinc-400">Aucun lot — ajoutez-en au moins deux.</p>}
        </div>
      </div>

      {/* Advanced settings — moved off this screen to keep setup simple. */}
      <Link
        href="/admin/fidelite/roue/reglages"
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-left transition hover:bg-zinc-50"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          </span>
          <span>
            <span className="block text-sm font-semibold text-zinc-900">Réglages avancés</span>
            <span className="block text-xs text-zinc-400">Coûts &amp; stock, limites, conditions, présence</span>
          </span>
        </span>
        <svg className="shrink-0 text-zinc-300" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
      </Link>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <ConfirmDialog
        open={!!prizeToDelete}
        title="Supprimer ce lot ?"
        message="Ce lot ne sera plus proposé sur la roue. Action irréversible."
        confirmLabel="Supprimer"
        danger
        onConfirm={() => {
          const id = prizeToDelete
          setPrizeToDelete(null)
          if (id) deletePrize(id)
        }}
        onCancel={() => setPrizeToDelete(null)}
      />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-zinc-50 p-3 text-center">
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-zinc-500">{label}</p>
    </div>
  )
}

/* Warm, on-brand palette (orange → amber) for the odds bar + per-lot dots. */
const PRIZE_COLORS = ['#F47B20', '#FB923C', '#F59E0B', '#FDBA74', '#FBBF24', '#EA580C', '#FCD34D', '#FED7AA']
