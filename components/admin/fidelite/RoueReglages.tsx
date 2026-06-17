'use client'

import Link from 'next/link'
import { gameCooldownHours, COOLDOWN_OPTIONS } from '@/lib/game'
import Field, { inputClass } from '@/components/admin/ui/Field'
import PlayGates from '@/components/admin/game/PlayGates'
import QrSessionLock from '@/components/admin/game/QrSessionLock'
import SurveyResponses from '@/components/admin/game/SurveyResponses'
import { useRoueGame } from './useRoueGame'
import { useOwnerBusiness } from './useOwnerBusiness'

/** "Réglages avancés" page body — everything kept off the simple roue screen. */
export default function RoueReglages() {
  const { business, loading } = useOwnerBusiness()
  if (loading) return <Loading />
  if (!business) return <p className="text-zinc-500">Aucun établissement trouvé</p>
  return <AdvancedBody businessId={business.id} />
}

function Loading() {
  return <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-400">Chargement…</div>
}

function AdvancedBody({ businessId }: { businessId: string }) {
  const { game, setGame, prizes, loading, setupNeeded, error, updateGame, updatePrize } = useRoueGame(businessId)

  if (loading) return <Loading />

  // No wheel yet → these settings don't exist; send the owner to set it up first.
  if (setupNeeded || !game) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
        <p className="font-semibold text-zinc-900">Configurez d’abord votre roue</p>
        <p className="mt-1 text-sm text-zinc-500">Les réglages avancés apparaîtront une fois la roue créée.</p>
        <Link href="/admin/fidelite/roue" className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600">
          Aller à la roue
        </Link>
      </div>
    )
  }

  // Budget estimate from the live odds: share = weight ÷ total weight of active lots.
  const active = prizes.filter((p) => p.active)
  const totalWeight = active.reduce((s, p) => s + Math.max(0, p.weight || 0), 0) || 1
  const avgCostPerPlay = active.reduce((s, p) => s + (Math.max(0, p.weight || 0) / totalWeight) * (Number(p.cost) || 0), 0)

  return (
    <div className="space-y-4">
      {/* Limits & timing */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h4 className="font-semibold text-zinc-900">Limites & fréquence</h4>
        <p className="mt-0.5 text-xs text-zinc-400">À quelle fréquence un client peut jouer, et combien de temps un gain reste valable.</p>
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
      </section>

      {/* Cost & stock per lot + budget */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h4 className="font-semibold text-zinc-900">Coûts & stock</h4>
        <p className="mt-0.5 text-xs text-zinc-400">Coût indicatif de chaque lot (pour estimer le budget) et stock limité si besoin.</p>
        <div className="mt-4 space-y-2">
          {prizes.length === 0 && <p className="py-4 text-center text-sm text-zinc-400">Aucun lot. Ajoutez-en depuis la roue.</p>}
          {prizes.map((p) => (
            <div key={p.id} className={`flex flex-wrap items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50/60 p-2.5 ${p.active ? '' : 'opacity-60'}`}>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-700">{p.label || 'Lot sans nom'}</span>
              <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                Coût
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={p.cost ?? ''}
                  placeholder="—"
                  onChange={(e) => updatePrize(p.id, { cost: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
                  className="w-20 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-center text-sm outline-none focus:ring-2 focus:ring-orange-500/30"
                />
                <span className="text-zinc-400">TND</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                Stock
                <input
                  type="number"
                  min={0}
                  value={p.stock ?? ''}
                  placeholder="∞"
                  onChange={(e) => updatePrize(p.id, { stock: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
                  className="w-20 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-center text-sm outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </label>
            </div>
          ))}
        </div>
        {active.length > 0 && (
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
      </section>

      {/* Conditions to play (social follow / link / survey) */}
      <PlayGates gameId={game.id} config={game.config || {}} onConfig={(c) => setGame({ ...game, config: c })} />

      {/* Require a recent QR scan to play */}
      <QrSessionLock gameId={game.id} config={game.config || {}} onConfig={(c) => setGame({ ...game, config: c })} />

      {/* Survey answers collected by the gates (shows only when there are any) */}
      <SurveyResponses businessId={businessId} />

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    </div>
  )
}
