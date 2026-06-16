'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type GameRow, type PrizeRow, gameCooldownHours, COOLDOWN_OPTIONS, splitInt } from '@/lib/game'
import Toggle from '@/components/admin/ui/Toggle'
import Button from '@/components/admin/ui/Button'
import Field, { inputClass } from '@/components/admin/ui/Field'
import SetupCard from '@/components/admin/game/SetupCard'
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog'
import PlayGates from '@/components/admin/game/PlayGates'
import QrSessionLock from '@/components/admin/game/QrSessionLock'
import SurveyResponses from '@/components/admin/game/SurveyResponses'

/**
 * Owner configuration for the roulette ("everyone wins, variable value").
 * Operate (validate won codes) lives in the Caisse console — this screen is
 * setup: activate, prizes (label/weight/stock), and the limits.
 */
export default function GameManager({ businessId, slug }: { businessId: string; slug: string }) {
  const supabase = createClient()
  const [game, setGame] = useState<GameRow | null>(null)
  const [prizes, setPrizes] = useState<PrizeRow[]>([])
  const [stats, setStats] = useState({ plays: 0, pending: 0, redeemed: 0 })
  const [loading, setLoading] = useState(true)
  const [setupNeeded, setSetupNeeded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prizeToDelete, setPrizeToDelete] = useState<string | null>(null)
  // Progressive disclosure — keep the screen simple (on/off + prizes) by default;
  // the owner opens "Options avancées" for costs, stock, budget, daily limits,
  // play conditions and the presence lock.
  const [advanced, setAdvanced] = useState(false)
  // Prize NAME persists on a short debounce (not only on blur) so a typed name is
  // never lost if the owner switches tab or navigates before the input blurs.
  const labelTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  // Slider odds persist on a short debounce so dragging stays smooth (one write
  // per settle, not one per pixel). pendingWeights collects the final value per lot.
  const weightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingWeights = useRef<Map<string, number>>(new Map())

  const load = useCallback(async () => {
    setError(null)
    const { data: g, error: gErr } = await (supabase.from('games') as any)
      .select('*')
      .eq('business_id', businessId)
      .eq('type', 'roulette')
      .maybeSingle()
    if (gErr) {
      if (gErr.code === '42P01' || gErr.message?.includes('does not exist') || gErr.message?.includes('schema cache')) {
        setSetupNeeded(true)
        setLoading(false)
        return
      }
      console.error('GameManager load error:', gErr)
      setError('Impossible de charger le jeu. Réessayez.')
      setLoading(false)
      return
    }
    setGame(g)
    if (g) {
      const midnight = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
      const now = new Date().toISOString()
      const [{ data: p }, plays, pending, redeemed] = await Promise.all([
        (supabase.from('prizes') as any).select('*').eq('game_id', g.id).order('position').order('created_at'),
        (supabase.from('plays') as any).select('id', { count: 'exact', head: true }).eq('game_id', g.id).gte('created_at', midnight),
        (supabase.from('wins') as any).select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('status', 'pending').gt('expires_at', now),
        (supabase.from('wins') as any).select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('status', 'redeemed').gte('redeemed_at', midnight),
      ])
      setPrizes(p || [])
      setStats({ plays: plays.count ?? 0, pending: pending.count ?? 0, redeemed: redeemed.count ?? 0 })
    }
    setLoading(false)
  }, [businessId, supabase])

  useEffect(() => {
    load()
  }, [load])

  // Flush nothing on unmount, just drop the pending timer to avoid a late setState.
  useEffect(() => () => { if (weightTimer.current) clearTimeout(weightTimer.current) }, [])

  const SAVE_MSG = 'Impossible d\'enregistrer. Réessayez.'

  // Writes go through the server (requireOwner + service role) so a stale browser
  // token can never silently block them — the old cause of "Impossible d'enregistrer".
  async function gameApi(action: string, payload: Record<string, unknown> = {}) {
    const res = await fetch('/api/admin/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    })
    const json = await res.json().catch(() => ({}))
    return { ok: res.ok, json }
  }

  async function createGame() {
    setBusy(true)
    setError(null)
    const { ok, json } = await gameApi('createGame')
    setBusy(false)
    if (!ok) { console.error('GameManager createGame error:', json.error); setError(json.error || SAVE_MSG); return }
    setSetupNeeded(false)
    await load()
  }

  async function updateGame(patch: Partial<GameRow>) {
    if (!game) return
    setGame({ ...game, ...patch })
    const { ok, json } = await gameApi('updateGame', { gameId: game.id, patch })
    if (!ok) { console.error('GameManager updateGame error:', json.error); setError(json.error || SAVE_MSG) }
  }

  async function updatePrize(id: string, patch: Partial<PrizeRow>) {
    setPrizes((cur) => cur.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    const { ok, json } = await gameApi('updatePrize', { prizeId: id, patch })
    if (!ok) { console.error('GameManager updatePrize error:', json.error); setError(json.error || SAVE_MSG) }
  }

  // Persist a single field without touching local state (state is already set by
  // the caller) — used by the odds slider so dragging doesn't churn React state.
  async function persistPrize(id: string, patch: Partial<PrizeRow>) {
    const { ok, json } = await gameApi('updatePrize', { prizeId: id, patch })
    if (!ok) { console.error('GameManager persistPrize error:', json.error); setError(json.error || SAVE_MSG) }
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
    if (!ok || !json.prize) { console.error('GameManager addPrize error:', json.error); setError(json.error || SAVE_MSG); return }
    const next = [...prizes, json.prize as PrizeRow]
    setPrizes(next)
    renormalizeActive(next) // give the new lot a fair share, keep the total at 100%
  }

  async function deletePrize(id: string) {
    const { ok, json } = await gameApi('deletePrize', { prizeId: id })
    if (!ok) { console.error('GameManager deletePrize error:', json.error); setError(json.error || SAVE_MSG); return }
    const next = prizes.filter((p) => p.id !== id)
    setPrizes(next)
    renormalizeActive(next) // re-spread the freed-up odds across the remaining lots
  }

  if (loading) {
    return <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-400">Chargement…</div>
  }

  if (setupNeeded || !game) {
    return (
      <SetupCard
        icon={<span aria-hidden="true">🎡</span>}
        title="Roue de la chance"
        description="Vos clients scannent, tournent la roue et gagnent toujours quelque chose — vous contrôlez les lots, leur fréquence et le stock. Un aimant à fidélité pour votre établissement."
        cta="Configurer ma roue"
        onActivate={createGame}
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
  // Average giveaway cost per spin, from the displayed odds (advanced/budget only).
  const avgCostPerPlay = activeList.reduce((s, p) => s + ((pctById[p.id] || 0) / 100) * (Number(p.cost) || 0), 0)

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
            <div key={p.id} className={`rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 ${p.active ? '' : 'opacity-60'}`}>
              {/* Row 1: name · active · delete */}
              <div className="flex items-center gap-2">
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
                  onClick={() => togglePrizeActive(p)}
                  aria-pressed={p.active}
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${p.active ? 'bg-green-100 text-green-700' : 'bg-zinc-200 text-zinc-500'}`}
                >
                  {p.active ? 'Actif' : 'Inactif'}
                </button>
                <button
                  type="button"
                  onClick={() => setPrizeToDelete(p.id)}
                  aria-label="Supprimer le lot"
                  title="Supprimer"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
              {/* Row 2: chance-of-winning slider — moving one auto-balances the rest to 100% */}
              {p.active ? (
                <div className="mt-3 flex items-center gap-3">
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
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-zinc-400">Désactivé — n&apos;apparaît pas sur la roue.</p>
              )}
              {/* Advanced: cost (feeds the budget) + stock cap */}
              {advanced && (
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <label className="block text-[11px] font-semibold text-zinc-500">
                    <span className="mb-1 block">Coût (TND)</span>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={p.cost ?? ''}
                      placeholder="—"
                      onChange={(e) => updatePrize(p.id, { cost: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-2.5 text-center text-base outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                  </label>
                  <label className="block text-[11px] font-semibold text-zinc-500">
                    <span className="mb-1 block">Stock</span>
                    <input
                      type="number"
                      min={0}
                      value={p.stock ?? ''}
                      placeholder="∞"
                      onChange={(e) => updatePrize(p.id, { stock: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-2.5 text-center text-base outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                  </label>
                </div>
              )}
            </div>
          ))}
          {prizes.length === 0 && <p className="py-6 text-center text-sm text-zinc-400">Aucun lot — ajoutez-en au moins deux.</p>}
        </div>

        {/* Giveaway budget — advanced only (odds now live on the sliders above) */}
        {advanced && activeList.length > 0 && (
          <div className="mt-4 space-y-2 rounded-xl bg-zinc-50 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-zinc-600">Coût moyen par partie</span>
              <span className="font-bold text-zinc-900">{avgCostPerPlay.toFixed(2)} TND</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-zinc-500">
              <span>Budget estimé · 100 parties</span>
              <span className="font-semibold">≈ {(avgCostPerPlay * 100).toFixed(0)} TND</span>
            </div>
          </div>
        )}
      </div>

      {/* Advanced options — collapsed by default to keep setup simple. */}
      <button
        type="button"
        onClick={() => setAdvanced((v) => !v)}
        aria-expanded={advanced}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-left transition hover:bg-zinc-50"
      >
        <span className="flex items-center gap-3">
          <span className="text-lg leading-none text-zinc-400" aria-hidden="true">⚙</span>
          <span>
            <span className="block text-sm font-semibold text-zinc-900">Options avancées</span>
            <span className="block text-xs text-zinc-400">Coûts &amp; stock, budget, limites, conditions, présence</span>
          </span>
        </span>
        <span className="shrink-0 text-sm text-zinc-400">{advanced ? '▲' : '▼'}</span>
      </button>

      {advanced && (
        <>
          {/* Réglages */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h4 className="font-semibold text-zinc-900">Réglages</h4>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Parties autorisées" hint="Par client (téléphone) et par appareil, sur la période choisie.">
                <input
                  type="number"
                  min={1}
                  value={game.daily_limit}
                  onChange={(e) => updateGame({ daily_limit: Math.max(1, Number(e.target.value)) })}
                  className={inputClass}
                />
              </Field>
              <Field label="Fréquence" hint="Délai avant de pouvoir rejouer — compté depuis la dernière partie.">
                <select
                  value={gameCooldownHours(game.config)}
                  onChange={(e) => updateGame({ config: { ...(game.config || {}), cooldownHours: Number(e.target.value) } })}
                  className={inputClass}
                >
                  {COOLDOWN_OPTIONS.map((o) => (
                    <option key={o.hours} value={o.hours}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Validité d’un gain (heures)" hint="Délai pour récupérer un lot avant expiration.">
                <input
                  type="number"
                  min={1}
                  value={game.win_expiry_hours}
                  onChange={(e) => updateGame({ win_expiry_hours: Math.max(1, Number(e.target.value)) })}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          {/* Conditions pour jouer (gates: social follow / link / survey) */}
          <PlayGates gameId={game.id} config={game.config || {}} onConfig={(c) => setGame({ ...game, config: c })} />

          {/* Exiger le scan du QR pour jouer (session QR limitée, contrôlée ici) */}
          <QrSessionLock gameId={game.id} config={game.config || {}} onConfig={(c) => setGame({ ...game, config: c })} />

          {/* Survey answers collected by the gates (shows only when there are any) */}
          <SurveyResponses businessId={businessId} />
        </>
      )}

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
