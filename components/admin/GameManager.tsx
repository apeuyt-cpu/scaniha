'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_PRIZES, type GameRow, type PrizeRow } from '@/lib/game'
import Toggle from '@/components/admin/ui/Toggle'
import Button from '@/components/admin/ui/Button'
import Field, { inputClass } from '@/components/admin/ui/Field'
import SetupCard from '@/components/admin/game/SetupCard'
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog'

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
    "Le jeu n'est pas encore disponible sur votre compte. Réessayez dans un instant ou contactez le support si le problème persiste."
  const SAVE_MSG = 'Impossible d\'enregistrer. Réessayez.'

  async function createGame() {
    setBusy(true)
    setError(null)
    try {
      const { data: g, error: gErr } = await (supabase.from('games') as any)
        .insert({ business_id: businessId, type: 'roulette', active: false })
        .select('*')
        .single()
      if (gErr) throw gErr
      const rows = DEFAULT_PRIZES.map((p, i) => ({ game_id: g.id, label: p.label, weight: p.weight, cost: p.cost, position: i }))
      const { error: pErr } = await (supabase.from('prizes') as any).insert(rows)
      if (pErr) throw pErr
      setSetupNeeded(false)
      await load()
    } catch (err: any) {
      if (isProvisioningError(err)) setError(PROVISION_MSG)
      else { console.error('GameManager createGame error:', err); setError(SAVE_MSG) }
    } finally {
      setBusy(false)
    }
  }

  async function updateGame(patch: Partial<GameRow>) {
    if (!game) return
    setGame({ ...game, ...patch })
    const { error: e } = await (supabase.from('games') as any).update(patch).eq('id', game.id)
    if (e) { console.error('GameManager updateGame error:', e); setError(SAVE_MSG) }
  }

  async function updatePrize(id: string, patch: Partial<PrizeRow>) {
    setPrizes((cur) => cur.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    const { error: e } = await (supabase.from('prizes') as any).update(patch).eq('id', id)
    if (e) { console.error('GameManager updatePrize error:', e); setError(SAVE_MSG) }
  }

  async function addPrize() {
    if (!game) return
    const { data, error: e } = await (supabase.from('prizes') as any)
      .insert({ game_id: game.id, label: 'Nouveau lot', weight: 1, position: prizes.length })
      .select('*')
      .single()
    if (e) { console.error('GameManager addPrize error:', e); setError(SAVE_MSG) }
    else setPrizes((cur) => [...cur, data])
  }

  async function deletePrize(id: string) {
    const { error: e } = await (supabase.from('prizes') as any).delete().eq('id', id)
    if (e) { console.error('GameManager deletePrize error:', e); setError(SAVE_MSG) }
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
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <Link href="/admin/caisse" className="font-semibold text-orange-600 hover:underline">Valider un code en caisse →</Link>
          {game.active && (
            <a href={`/${slug}/jeu`} target="_blank" className="font-semibold text-zinc-500 hover:text-zinc-700">Voir la page du jeu ↗</a>
          )}
        </div>
      </div>

      {/* Prizes */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-zinc-900">Lots de la roue</h4>
            <p className="text-xs text-zinc-400">Poids = fréquence relative (plus haut = plus fréquent). Stock vide = illimité.</p>
          </div>
          <Button variant="neutral" onClick={addPrize} className="!min-h-0 px-3 py-2 text-xs">+ Lot</Button>
        </div>
        <div className="mt-4 space-y-2.5">
          {prizes.map((p) => (
            <div key={p.id} className={`rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 ${p.active ? '' : 'opacity-60'}`}>
              {/* Row 1: name + delete */}
              <div className="flex items-center gap-2">
                <input
                  value={p.label}
                  onChange={(e) => setPrizes((cur) => cur.map((x) => (x.id === p.id ? { ...x, label: e.target.value } : x)))}
                  onBlur={(e) => updatePrize(p.id, { label: e.target.value })}
                  className={`${inputClass} min-w-0 flex-1`}
                  placeholder="Nom du lot"
                />
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
              {/* Row 2: weight, stock, active */}
              <div className="mt-2.5 flex items-center gap-2">
                <label className="flex flex-1 items-center gap-1.5 text-xs font-medium text-zinc-500">
                  <span className="shrink-0">Poids</span>
                  <input
                    type="number"
                    min={0}
                    value={p.weight}
                    onChange={(e) => updatePrize(p.id, { weight: Math.max(0, Number(e.target.value)) })}
                    className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-center text-sm outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </label>
                <label className="flex flex-1 items-center gap-1.5 text-xs font-medium text-zinc-500">
                  <span className="shrink-0">Stock</span>
                  <input
                    type="number"
                    min={0}
                    value={p.stock ?? ''}
                    placeholder="∞"
                    onChange={(e) => updatePrize(p.id, { stock: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
                    className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-center text-sm outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => updatePrize(p.id, { active: !p.active })}
                  aria-pressed={p.active}
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${p.active ? 'bg-green-100 text-green-700' : 'bg-zinc-200 text-zinc-500'}`}
                >
                  {p.active ? 'Actif' : 'Inactif'}
                </button>
              </div>
            </div>
          ))}
          {prizes.length === 0 && <p className="py-6 text-center text-sm text-zinc-400">Aucun lot — ajoutez-en au moins deux.</p>}
        </div>
      </div>

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
