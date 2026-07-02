'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { type PrizeRow, splitInt } from '@/lib/game'
import { useRoueGame } from '@/components/admin/fidelite/useRoueGame'
import Toggle from '@/components/admin/kit/Toggle'
import Button from '@/components/admin/kit/Button'
import { inputClass } from '@/components/admin/kit/Field'
import SetupCard from '@/components/admin/game/SetupCard'
import ConfirmDialog from '@/components/admin/kit/ConfirmDialog'
import { CardSkeleton } from '@/components/admin/kit/Skeleton'
import PrizeIconPicker from '@/components/admin/game/PrizeIconPicker'

export default function GameManager({ businessId, slug }: { businessId: string; slug: string }) {
  const {
    game, prizes, setPrizes, stats, loading, setupNeeded, error, setError,
    gameApi, createGame, updateGame, updatePrize, persistPrize,
  } = useRoueGame(businessId)

  const [busy, setBusy] = useState(false)
  const [prizeToDelete, setPrizeToDelete] = useState<string | null>(null)
  const labelTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const weightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingWeights = useRef<Map<string, number>>(new Map())

  useEffect(() => () => { if (weightTimer.current) clearTimeout(weightTimer.current) }, [])

  async function handleCreate() {
    setBusy(true)
    await createGame()
    setBusy(false)
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
    if (!ok || !json.prize) { setError(json.error || 'Impossible d\'enregistrer. Réessayez.'); return }
    const next = [...prizes, json.prize as PrizeRow]
    setPrizes(next)
    renormalizeActive(next)
  }

  async function deletePrize(id: string) {
    const { ok, json } = await gameApi('deletePrize', { prizeId: id })
    if (!ok) { setError(json.error || 'Impossible d\'enregistrer. Réessayez.'); return }
    const next = prizes.filter((p) => p.id !== id)
    setPrizes(next)
    renormalizeActive(next) 
  }

  if (loading) {
    return <CardSkeleton rows={4} />
  }

  if (setupNeeded || !game) {
    return (
      <SetupCard
        icon={<span aria-hidden="true">🎰</span>}
        title="Jeux de Casino"
        description="Vos clients scannent, jouent et gagnent toujours quelque chose — vous contrôlez les lots et leur pourcentage de victoire. Un aimant à fidélité super pro."
        cta="Configurer mes jeux"
        onActivate={handleCreate}
        busy={busy}
        error={error}
      />
    )
  }

  const activeList = prizes.filter((p) => p.active)
  const activePcts = splitInt(activeList.map((p) => Math.max(0, p.weight || 0)), 100, activeList.length ? 1 : 0)
  const pctById: Record<string, number> = {}
  activeList.forEach((p, i) => { pctById[p.id] = activePcts[i] })
  const activePrizes = activeList.length
  const sliderMax = Math.max(1, 100 - (activeList.length - 1))
  const colorById: Record<string, string> = {}
  prizes.forEach((p, i) => { colorById[p.id] = PRIZE_COLORS[i % PRIZE_COLORS.length] })

  const currentMode = game.config?.mode ?? 'roulette'
  const currentTheme = game.config?.theme ?? 'gold'

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <Toggle
          checked={game.active}
          onChange={(v) => updateGame({ active: v })}
          label={game.active ? 'Jeu actif' : 'Jeu désactivé'}
          hint={game.active ? 'Le jeu apparaît sur l\'espace fidélité.' : 'Activez pour afficher le jeu.'}
        />
        {game.active && activePrizes < 2 && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Ajoutez au moins 2 lots actifs pour que le jeu s&apos;affiche.
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

      {/* Mode de jeu */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg">🎰</span>
          <h4 className="font-semibold text-zinc-900">Mode de jeu</h4>
        </div>
        <div className="flex gap-2">
          {(['roulette', 'slot777'] as const).map((mode) => {
            const labels: Record<string, string> = { roulette: '🎡 Roulette Casino', slot777: '7️⃣ Slot Machine' }
            const active = currentMode === mode
            return (
              <button
                key={mode}
                type="button"
                onClick={() => updateGame({ config: { ...game.config, mode } })}
                className={`flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition ${
                  active ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                }`}
              >
                {labels[mode]}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-zinc-400">La machine à sous propose une expérience classique 777. La roulette est une roue élégante.</p>
      </div>

      {/* Theme */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h4 className="font-semibold text-zinc-900">Thème Visuel</h4>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: 'gold', label: '🏆 Gold & Red', colors: ['#8B0000', '#F5C518'] },
            { id: 'neon', label: '💜 Vegas Neon', colors: ['#1a0033', '#FF00FF'] },
            { id: 'classic', label: '🃏 Classic', colors: ['#000000', '#FFFFFF'] },
          ] as const).map((theme) => {
            const active = currentTheme === theme.id
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => updateGame({ config: { ...game.config, theme: theme.id } })}
                className={`rounded-xl border-2 py-3 text-xs font-semibold transition ${
                  active ? 'ring-2 ring-offset-1 ring-amber-400' : ''
                }`}
                style={{ background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})`, color: theme.id === 'classic' ? '#000' : '#fff', borderColor: active ? '#F5C518' : 'transparent' }}
              >
                {theme.label}
              </button>
            )
          })}
        </div>
      </div>


      {/* Slot Machine 777 Settings */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg">🎰</span>
          <h4 className="font-semibold text-zinc-900">Slot Machine 777</h4>
        </div>
        <div className="mb-3">
          <Toggle
            checked={Boolean(game.config?.slotEnabled)}
            onChange={(v) => updateGame({ config: { ...game.config, slotEnabled: v } })}
            label="Activer le Slot Machine"
          />
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-zinc-700">Coût par partie (points)</span>
          <input
            type="number" min={1} max={500}
            value={game.config?.slotPointCost ?? 10}
            onChange={(e) => updateGame({ config: { ...game.config, slotPointCost: Number(e.target.value) } })}
            className="w-24 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm text-right"
          />
        </div>
        <p className="text-xs text-zinc-400">Les joueurs dépensent ces points pour faire tourner la machine.</p>
      </div>

      {/* Roulette Schedule */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg">🎡</span>
          <h4 className="font-semibold text-zinc-900">Disponibilité de la Roulette</h4>
        </div>
        <div className="mb-3">
          <Toggle
            checked={game.config?.rouletteEnabled !== false}
            onChange={(v) => updateGame({ config: { ...game.config, rouletteEnabled: v } })}
            label="Toujours disponible"
          />
        </div>
        {game.config?.rouletteEnabled !== false && (
          <>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs text-zinc-500">Heure de début</label>
              <input
                type="time"
                value={game.config?.rouletteSchedule?.startTime || ''}
                onChange={(e) => updateGame({ config: { ...game.config, rouletteSchedule: { ...(game.config?.rouletteSchedule || {}), startTime: e.target.value, enabled: true } } })}
                className="w-32 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-500">Heure de fin</label>
              <input
                type="time"
                value={game.config?.rouletteSchedule?.endTime || ''}
                onChange={(e) => updateGame({ config: { ...game.config, rouletteSchedule: { ...(game.config?.rouletteSchedule || {}), endTime: e.target.value, enabled: true } } })}
                className="w-32 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
              />
            </div>
            <p className="mt-2 text-xs text-zinc-400">Laissez vide pour toujours disponible. Ex: 12:00 → 22:00</p>
          </>
        )}
      </div>

      {/* Prizes */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-zinc-900">Lots & Pourcentage de victoire</h4>
            <p className="mt-0.5 text-xs text-zinc-400">
              Glissez pour régler la chance de chaque lot — le total reste toujours à 100&nbsp;%.
            </p>
          </div>
          <Button variant="neutral" onClick={addPrize} className="!min-h-0 shrink-0 px-3 py-2 text-xs">+ Lot</Button>
        </div>

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
          </div>
        )}

        <div className="mt-4 space-y-2.5">
          {prizes.map((p) => (
            <div key={p.id} className={`rounded-xl border border-zinc-200 bg-white p-3.5 transition ${p.active ? '' : 'opacity-70'}`}>
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: p.active ? colorById[p.id] : '#D4D4D8' }}
                  aria-hidden="true"
                />
                
                {/* ICON PICKER */}
                <PrizeIconPicker
                  value={(p as any).config?.icon || ''}
                  onChange={(icon) => {
                    const nextConfig = { ...(p as any).config, icon }
                    setPrizes((cur) => cur.map((x) => (x.id === p.id ? { ...x, config: nextConfig } : x)))
                    updatePrize(p.id, { config: nextConfig } as any)
                  }}
                />

                
                <div className="flex items-center gap-1.5">
                  <div className="w-24 shrink-0">
                    <Toggle
                      checked={Boolean((p as any).config?.isLose)}
                      onChange={(v) => {
                        const nextConfig = { ...((p as any).config || {}), isLose: v }
                        setPrizes(cur => cur.map(x => x.id === p.id ? { ...x, config: nextConfig } as any : x))
                        persistPrize(p.id, { config: nextConfig } as any)
                      }}
                      label={(p as any).config?.isLose ? '💀 Perte' : '🎁 Gain'}
                    />
                  </div>
                </div>

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
                  <span className="text-[11px] text-zinc-400">N&apos;apparaît pas sur le jeu.</span>
                )}
              </div>
            </div>
          ))}
          {prizes.length === 0 && <p className="py-6 text-center text-sm text-zinc-400">Aucun lot — ajoutez-en au moins deux.</p>}
        </div>
      </div>

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
        message="Ce lot ne sera plus proposé sur le jeu. Action irréversible."
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

const PRIZE_COLORS = ['#F47B20', '#FB923C', '#F59E0B', '#FDBA74', '#FBBF24', '#EA580C', '#FCD34D', '#FED7AA']