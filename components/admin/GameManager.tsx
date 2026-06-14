'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type GameRow, type PrizeRow } from '@/lib/game'
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

  function saveLabelDebounced(id: string, label: string) {
    clearTimeout(labelTimers.current[id])
    labelTimers.current[id] = setTimeout(() => updatePrize(id, { label }), 600)
  }

  async function addPrize() {
    if (!game) return
    const { ok, json } = await gameApi('addPrize', { gameId: game.id, position: prizes.length })
    if (!ok || !json.prize) { console.error('GameManager addPrize error:', json.error); setError(json.error || SAVE_MSG) }
    else setPrizes((cur) => [...cur, json.prize])
  }

  async function deletePrize(id: string) {
    const { ok, json } = await gameApi('deletePrize', { prizeId: id })
    if (!ok) { console.error('GameManager deletePrize error:', json.error); setError(json.error || SAVE_MSG) }
    else setPrizes((cur) => cur.filter((p) => p.id !== id))
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

  const activePrizes = prizes.filter((p) => p.active && p.weight > 0).length

  // Drop chance = a prize's weight as a share of all active weight, so the owner
  // tunes the odds directly (and, with the cost field, can budget the giveaway).
  const totalWeight = prizes.reduce((s, p) => (p.active ? s + Math.max(0, p.weight || 0) : s), 0)
  const chancePct = (w: number | null | undefined) =>
    totalWeight > 0 ? (Math.max(0, w || 0) / totalWeight) * 100 : 0
  const avgCostPerPlay =
    totalWeight > 0
      ? prizes.reduce(
          (s, p) => (p.active ? s + (Math.max(0, p.weight || 0) / totalWeight) * (Number(p.cost) || 0) : s),
          0
        )
      : 0

  // One-tap: scale active weights so they sum to 100 → weight reads as the % directly.
  async function balanceTo100() {
    const active = prizes.filter((p) => p.active && p.weight > 0)
    const tot = active.reduce((s, p) => s + p.weight, 0)
    if (tot <= 0) return
    for (const p of active) {
      const w = Math.max(1, Math.round((p.weight / tot) * 100))
      if (w !== p.weight) await updatePrize(p.id, { weight: w })
    }
  }

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
              Ajoutez vos lots et leur chance de tomber. Tout le monde gagne quelque chose.
            </p>
          </div>
          <Button variant="neutral" onClick={addPrize} className="!min-h-0 shrink-0 px-3 py-2 text-xs">+ Lot</Button>
        </div>
        <div className="mt-4 space-y-2.5">
          {prizes.map((p) => (
            <div key={p.id} className={`rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 ${p.active ? '' : 'opacity-60'}`}>
              {/* Row 1: name · active · delete */}
              <div className="flex items-center gap-2">
                <input
                  value={p.label}
                  onChange={(e) => { const v = e.target.value; setPrizes((cur) => cur.map((x) => (x.id === p.id ? { ...x, label: v } : x))); saveLabelDebounced(p.id, v) }}
                  onBlur={(e) => { clearTimeout(labelTimers.current[p.id]); updatePrize(p.id, { label: e.target.value }) }}
                  className={`${inputClass} min-w-0 flex-1`}
                  placeholder="Nom du lot"
                />
                <button
                  type="button"
                  onClick={() => updatePrize(p.id, { active: !p.active })}
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
              {/* Row 2: win chance (weight) + the real % it represents */}
              <div className="mt-2.5 flex items-center gap-3">
                <label className="flex items-center gap-2 text-[11px] font-semibold text-zinc-500">
                  <span>Chance</span>
                  <input
                    type="number"
                    min={0}
                    value={p.weight}
                    onChange={(e) => updatePrize(p.id, { weight: Math.max(0, Number(e.target.value)) })}
                    className="w-16 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-center text-base outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </label>
                <span className={`text-xs font-bold ${p.active ? 'text-green-600' : 'text-zinc-400'}`}>
                  ≈ {chancePct(p.weight).toFixed(0)}% des tours
                </span>
              </div>
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

        {/* Odds total + giveaway budget — advanced only */}
        {advanced && prizes.length > 0 && (
          <div className="mt-4 space-y-2 rounded-xl bg-zinc-50 p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-zinc-600">
                Total des chances : <span className="text-zinc-900">{totalWeight}</span>
              </span>
              {totalWeight > 0 && totalWeight !== 100 && (
                <button type="button" onClick={balanceTo100} className="font-semibold text-orange-600 hover:underline">
                  Répartir sur 100&nbsp;%
                </button>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-zinc-200 pt-2">
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
              <Field label="Parties par jour" hint="Par client (téléphone) et par appareil.">
                <input
                  type="number"
                  min={1}
                  value={game.daily_limit}
                  onChange={(e) => updateGame({ daily_limit: Math.max(1, Number(e.target.value)) })}
                  className={inputClass}
                />
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
