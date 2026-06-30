'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/admin/kit/Button'
import Field, { inputClass } from '@/components/admin/kit/Field'
import QrScanButton from './QrScanButton'
import type { ValidateResult, CustomerSummary } from '@/lib/game'

interface Pending {
  id: string
  code: string
  reward_label: string
  points_cost: number
  customer_phone: string
  created_at: string
  expires_at: string
}

interface Reward { id: string; label: string; points_cost: number; image_url: string | null }

const REASON_LABELS: Record<string, string> = {
  purchase: 'Achat',
  play: 'Roue de la chance',
  welcome: 'Bienvenue',
  redeem: 'Récompense échangée',
  adjust: 'Ajustement',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

async function caisse(action: string, payload: Record<string, unknown>) {
  const res = await fetch('/api/admin/caisse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, json }
}

/** The owner's day-to-day console: a customer-centric card (always open) for
 *  crediting purchases + redeeming rewards, plus the pending-requests and
 *  code-validation workflows. */
export default function CaisseConsole() {
  return (
    <div className="space-y-5">
      <CustomerConsole />
      <PendingRequestsCard />
      <ValidateCard />
    </div>
  )
}

/* ── Customer console — identify, credit, redeem (the merged main card) ─── */
function CustomerConsole() {
  const [phone, setPhone] = useState('')
  const [data, setData] = useState<(CustomerSummary & { phone: string }) | null>(null)
  const [loadingCust, setLoadingCust] = useState(false)
  const [custErr, setCustErr] = useState<string | null>(null)

  const [rewards, setRewards] = useState<Reward[]>([])

  const [amount, setAmount] = useState('')
  const [creditBusy, setCreditBusy] = useState(false)
  const [redeemBusyId, setRedeemBusyId] = useState<string | null>(null)
  const [redeemConfirmId, setRedeemConfirmId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tone: 'green' | 'red'; text: string } | null>(null)

  // Active rewards, once.
  useEffect(() => {
    caisse('rewards', {}).then(({ ok, json }) => {
      if (!ok) return
      setRewards(Array.isArray(json.rewards) ? json.rewards : [])
    })
  }, [])

  async function loadCustomer(p?: string) {
    const ph = (p ?? phone).trim()
    if (!ph) return
    setLoadingCust(true); setCustErr(null); setMsg(null); setRedeemConfirmId(null)
    const { ok, json } = await caisse('lookup', { phone: ph })
    setLoadingCust(false)
    if (!ok) { setCustErr(json.error || 'Numéro invalide.'); setData(null); return }
    setData(json); setPhone(json.phone || ph)
  }

  function onScan(p: string) { setPhone(p); loadCustomer(p) }

  function clearCustomer() {
    setData(null); setPhone(''); setAmount(''); setMsg(null); setCustErr(null); setRedeemConfirmId(null)
  }

  async function credit() {
    if (!data) return
    const amt = Number(amount)
    if (!amt || amt <= 0) { setMsg({ tone: 'red', text: 'Saisissez un montant valide.' }); return }
    setCreditBusy(true); setMsg(null)
    // Fresh per-click key: a network retry of THIS submit reuses it (server
    // collapses the replay, no double credit); a deliberate repeat purchase is
    // a new click → new key → credited again. crypto.randomUUID is available in
    // every browser this admin runs in (secure-context only, which /admin is).
    const idemKey = crypto.randomUUID()
    const { ok, json } = await caisse('award', { phone: data.phone, amount: amt, idemKey })
    setCreditBusy(false)
    if (!ok || !json.ok) { setMsg({ tone: 'red', text: json.error || 'Erreur.' }); return }
    const welcome = json.welcomeAdded ? ` (+${json.welcomeAdded} bienvenue)` : ''
    setMsg({ tone: 'green', text: `✓ +${json.pointsAdded} points${welcome} · nouveau solde ${json.balance}` })
    setAmount('')
    loadCustomer(data.phone)
  }

  async function redeem(r: Reward) {
    if (!data) return
    setRedeemBusyId(r.id); setRedeemConfirmId(null); setMsg(null)
    const { ok, json } = await caisse('counterRedeem', { phone: data.phone, reward_id: r.id })
    setRedeemBusyId(null)
    if (!ok || !json.ok) { setMsg({ tone: 'red', text: json.error || 'Erreur.' }); return }
    setMsg({ tone: 'green', text: `✓ « ${json.rewardLabel} » remis · −${json.pointsCost} pts · solde ${json.balance}` })
    loadCustomer(data.phone)
  }

  const balance = data?.balance ?? 0

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="font-bold text-zinc-900">Client</h2>
      <p className="mt-0.5 text-sm text-zinc-500">Scannez la carte du client ou saisissez son numéro — sa carte de fidélité s’ouvre ici.</p>

      {/* Identify bar — always visible */}
      <div className="mt-4 flex gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadCustomer()}
          placeholder="+216 …"
          aria-label="Numéro de téléphone du client"
          inputMode="tel"
          autoComplete="off"
          className={`${inputClass} flex-1`}
        />
        <QrScanButton onScan={onScan} />
        <Button variant="primary" onClick={() => loadCustomer()} disabled={loadingCust || !phone.trim()} className="shrink-0">
          {loadingCust ? '…' : 'Ouvrir'}
        </Button>
      </div>
      {custErr && <p role="alert" className="mt-3 text-sm text-red-600">{custErr}</p>}

      {/* Customer card — always-on area */}
      <div className="mt-4">
        {loadingCust ? (
          <div className="space-y-3">
            <div className="h-16 animate-pulse rounded-xl bg-zinc-100" />
            <div className="h-24 animate-pulse rounded-xl bg-zinc-100" />
          </div>
        ) : !data ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-10 text-center">
            <p className="text-sm text-zinc-400">Scannez ou saisissez un numéro pour afficher la carte du client.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Balance header */}
            <div className="flex items-center justify-between rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-3.5 text-white">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">Solde de points</p>
                <p className="mt-0.5 text-3xl font-bold leading-none tabular-nums">{balance}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-medium text-white/90" dir="ltr">{data.phone}</p>
                <button type="button" onClick={clearCustomer} className="mt-1 text-xs font-semibold text-white/80 underline-offset-2 hover:underline">Changer de client</button>
              </div>
            </div>

            {msg && <p role="status" aria-live="polite" className={`text-sm font-medium ${msg.tone === 'green' ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}

            {/* Action: credit a purchase */}
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-4">
              <h3 className="text-sm font-bold text-zinc-900">Créditer un achat</h3>
              <p className="mt-0.5 text-xs text-zinc-500">1 dinar dépensé = 1 point.</p>
              <div className="mt-3 flex items-end gap-2">
                <Field label="Addition (TND)">
                  <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && credit()} placeholder="25" inputMode="decimal" className={inputClass} />
                </Field>
                <Button variant="success" onClick={credit} disabled={creditBusy || !amount} className="shrink-0">
                  {creditBusy ? '…' : '+ Créditer'}
                </Button>
              </div>
            </div>

            {/* Action: redeem a reward at the counter */}
            {rewards.length > 0 && (
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-4">
                <h3 className="text-sm font-bold text-zinc-900">Échanger une récompense</h3>
                <p className="mt-0.5 text-xs text-zinc-500">Le client échange ses points contre une récompense, remise tout de suite.</p>
                <div className="mt-3 space-y-2">
                  {rewards.map((r) => {
                    const affordable = balance >= r.points_cost
                    const busy = redeemBusyId === r.id
                    const confirming = redeemConfirmId === r.id
                    return (
                      <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-100 bg-white p-2.5">
                        {r.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.image_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500" aria-hidden="true">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" /><rect x="2" y="7" width="20" height="5" rx="1" /><path d="M12 21V7" /></svg>
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-zinc-900">{r.label}</p>
                          <p className={`text-xs font-bold ${affordable ? 'text-orange-600' : 'text-zinc-400'}`}>{r.points_cost} pts{!affordable ? ` · il manque ${r.points_cost - balance}` : ''}</p>
                        </div>
                        {confirming ? (
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span className="text-xs font-medium text-zinc-500">−{r.points_cost} pts&nbsp;?</span>
                            <button type="button" onClick={() => redeem(r)} disabled={busy} className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50">{busy ? '…' : 'Confirmer'}</button>
                            <button type="button" onClick={() => setRedeemConfirmId(null)} className="rounded-lg px-2 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-800">Annuler</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setRedeemConfirmId(r.id)} disabled={!affordable || busy} className="shrink-0 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400">
                            Échanger
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Codes à remettre */}
            {(data.activeWins.length > 0 || data.activeRedemptions.length > 0) && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Codes à remettre</h3>
                <div className="mt-2 space-y-1.5">
                  {[...data.activeWins.map((c) => ({ ...c, kind: 'Lot' })), ...data.activeRedemptions.map((c) => ({ ...c, kind: 'Récompense' }))].map((c) => (
                    <div key={c.code} className="flex items-center justify-between gap-2 rounded-xl border border-zinc-100 px-3 py-2 text-sm">
                      <span>
                        <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono font-bold tracking-wider text-zinc-900">{c.code}</span>
                        <span className="ml-2 font-medium text-zinc-700">{c.label}</span>
                        <span className="ml-1.5 text-xs text-zinc-400">· {c.kind}</span>
                      </span>
                      <span className="shrink-0 text-xs text-zinc-400">exp. {fmt(c.expires_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historique */}
            {data.recent.length > 0 ? (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Historique</h3>
                <div className="mt-2 space-y-1">
                  {data.recent.map((t, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg px-1 py-1.5 text-sm">
                      <span className="text-zinc-600">
                        {REASON_LABELS[t.reason] || t.reason}
                        {t.note ? ` · ${t.note}` : ''}
                        <span className="ml-1.5 text-xs text-zinc-300">{fmt(t.created_at)}</span>
                      </span>
                      <span className={`font-semibold ${t.delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>{t.delta >= 0 ? `+${t.delta}` : t.delta}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : balance === 0 ? (
              <p className="text-sm text-zinc-400">Aucune activité pour ce numéro — créditez un premier achat ci-dessus.</p>
            ) : null}
          </div>
        )}
      </div>

      <p className="mt-5 border-t border-zinc-100 pt-4 text-xs text-zinc-400">
        Configurer les récompenses : <Link href="/admin/fidelite" className="font-semibold text-orange-600 hover:underline">Programme de fidélité →</Link>
        <span className="mx-1.5">·</span>
        <Link href="/admin/personnel" className="font-semibold text-orange-600 hover:underline">Gérer le personnel →</Link>
      </p>
    </div>
  )
}

/* ── Pending reward requests — approve (remit) or decline (refund points) ─── */
function PendingRequestsCard() {
  const [list, setList] = useState<Pending[] | null>(null) // null = loading
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tone: 'green' | 'red'; text: string } | null>(null)

  async function load() {
    const { ok, json } = await caisse('pending', {})
    setList(ok && Array.isArray(json.pending) ? (json.pending as Pending[]) : [])
  }
  useEffect(() => { load() }, [])

  async function approve(p: Pending) {
    setBusyId(p.id); setConfirmId(null); setMsg(null)
    const { ok, json } = await caisse('validate', { code: p.code })
    setBusyId(null)
    if (ok && json.found && json.status === 'redeemed') {
      setList((cur) => (cur || []).filter((x) => x.id !== p.id))
      setMsg({ tone: 'green', text: `✓ « ${p.reward_label} » remis · ${p.customer_phone}` })
    } else {
      setMsg({ tone: 'red', text: json.status === 'already' ? 'Déjà remis.' : json.error || 'Action impossible.' })
      load()
    }
  }
  async function decline(p: Pending) {
    setBusyId(p.id); setConfirmId(null); setMsg(null)
    const { ok, json } = await caisse('decline', { code: p.code })
    setBusyId(null)
    if (ok && json.ok) {
      setList((cur) => (cur || []).filter((x) => x.id !== p.id))
      setMsg({ tone: 'green', text: `Refusé · ${json.refunded} points remboursés à ${p.customer_phone}` })
    } else {
      setMsg({ tone: 'red', text: json.error || 'Action impossible.' })
      load()
    }
  }

  const count = list?.length ?? 0
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-zinc-900">Demandes en attente{count > 0 ? ` (${count})` : ''}</h2>
          <p className="mt-0.5 text-sm text-zinc-500">Récompenses échangées par vos clients depuis l’app — approuvez pour les remettre, ou refusez pour rembourser les points.</p>
        </div>
        <button type="button" onClick={() => { setList(null); load() }} className="shrink-0 text-sm font-semibold text-orange-600 hover:text-orange-700">Actualiser</button>
      </div>

      {msg && <p role="status" aria-live="polite" className={`mt-3 text-sm font-medium ${msg.tone === 'green' ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}

      <div className="mt-4">
        {list === null ? (
          <div className="space-y-2">
            {[0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100" />)}
          </div>
        ) : list.length === 0 ? (
          <p className="rounded-xl bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-400">Aucune demande en attente.</p>
        ) : (
          <div className="space-y-2">
            {list.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-zinc-900">{p.reward_label}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {p.customer_phone} · <span className="font-semibold text-zinc-600">{p.points_cost} pts</span> · {fmt(p.created_at)}
                  </p>
                  <p className="font-mono text-[11px] tracking-wider text-zinc-400">{p.code}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {confirmId === p.id ? (
                    <>
                      <span className="text-xs font-medium text-zinc-500">Refuser&nbsp;?</span>
                      <button type="button" onClick={() => decline(p)} disabled={busyId === p.id} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50">
                        {busyId === p.id ? '…' : 'Oui, rembourser'}
                      </button>
                      <button type="button" onClick={() => setConfirmId(null)} className="rounded-lg px-2 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-800">Non</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => setConfirmId(p.id)} disabled={busyId === p.id} className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50">Refuser</button>
                      <Button variant="success" onClick={() => approve(p)} disabled={busyId === p.id} className="!min-h-0 px-3 py-2 text-sm">
                        {busyId === p.id ? '…' : '✓ Approuver'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Validate a code (win or reward) — two-step: check → collect ───── */
function ValidateCard() {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [collecting, setCollecting] = useState(false)
  const [result, setResult] = useState<ValidateResult | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // Step 1: PEEK the code — shows what it is without consuming it.
  async function check() {
    const c = code.trim()
    if (c.replace(/[^A-Za-z0-9]/g, '').length < 4) {
      setErr('Entrez un code valide.')
      return
    }
    setBusy(true)
    setErr(null)
    setResult(null)
    const { ok, json } = await caisse('check', { code: c })
    setBusy(false)
    if (!ok) {
      setErr(json.error || 'Erreur.')
      return
    }
    setResult(json as ValidateResult)
  }

  // Step 2: COLLECT — atomically marks it redeemed so it can't be reused.
  async function collect() {
    setCollecting(true)
    setErr(null)
    const { ok, json } = await caisse('validate', { code: code.trim() })
    setCollecting(false)
    if (!ok) {
      setErr(json.error || 'Erreur.')
      return
    }
    setResult(json as ValidateResult)
  }

  function reset() {
    setCode('')
    setResult(null)
    setErr(null)
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="font-bold text-zinc-900">Valider un code</h2>
      <p className="mt-0.5 text-sm text-zinc-500">Le client montre un code (lot de la roue ou récompense) — vérifiez-le, puis marquez-le comme récupéré.</p>
      <div className="mt-4 flex gap-2">
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setResult(null) }}
          onKeyDown={(e) => e.key === 'Enter' && check()}
          placeholder="K7F-3QZ"
          aria-label="Code à valider"
          autoCapitalize="characters"
          autoComplete="off"
          className={`${inputClass} font-mono text-base tracking-[0.2em]`}
        />
        <Button variant="primary" onClick={check} disabled={busy} className="shrink-0">
          {busy ? '…' : 'Vérifier'}
        </Button>
      </div>
      {err && <p role="alert" className="mt-3 text-sm text-red-600">{err}</p>}
      {result && <ValidateResultView result={result} collecting={collecting} onCollect={collect} onReset={reset} />}
    </div>
  )
}

function ValidateResultView({ result, collecting, onCollect, onReset }: { result: ValidateResult; collecting: boolean; onCollect: () => void; onReset: () => void }) {
  if (!result.found) return <Banner tone="red" title="Code introuvable" text="Vérifiez le code saisi." />
  const kind = result.kind === 'win' ? 'Lot' : 'Récompense'
  const who = result.customerPhone ? ` · ${result.customerPhone}` : ''

  // Step-2 affordance: a still-claimable code → show it + the collect button.
  if (result.status === 'valid') {
    return (
      <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{kind} à remettre</p>
        <p className="mt-1 text-lg font-bold text-zinc-900">{result.label}</p>
        <p className="mt-0.5 text-sm text-zinc-500">
          Client{who}{result.expiresAt ? ` · valable jusqu’au ${fmt(result.expiresAt)}` : ''}
        </p>
        <Button variant="success" onClick={onCollect} disabled={collecting} className="mt-4 w-full">
          {collecting ? 'Validation…' : '✓ Marquer comme récupéré'}
        </Button>
        <p className="mt-2 text-center text-xs text-zinc-400">Une fois récupéré, ce code ne pourra plus être réutilisé.</p>
      </div>
    )
  }

  if (result.status === 'redeemed') {
    return (
      <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-4 text-center">
        <p className="text-sm font-bold text-green-800">✓ Récupéré — {result.label}</p>
        <p className="mt-0.5 text-sm text-green-700/90">{kind} remis au client{who}.</p>
        <button type="button" onClick={onReset} className="mt-3 text-sm font-semibold text-zinc-600 hover:text-zinc-900">
          Valider un autre code
        </button>
      </div>
    )
  }

  if (result.status === 'already')
    return <Banner tone="amber" title="Déjà utilisé" text={`${kind} « ${result.label} » déjà remis${result.redeemedAt ? ` le ${fmt(result.redeemedAt)}` : ''}${who}.`} />
  if (result.status === 'expired') return <Banner tone="amber" title="Code expiré" text={`${kind} « ${result.label} » — ce code n’est plus valable${who}.`} />
  return <Banner tone="amber" title="Code annulé" text={`${kind} « ${result.label} »${who}.`} />
}

/* ── shared status banner ────────────────────────────────────────── */
function Banner({ tone, title, text }: { tone: 'green' | 'amber' | 'red'; title: string; text: string }) {
  const styles = {
    green: 'border-green-200 bg-green-50 text-green-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-red-200 bg-red-50 text-red-700',
  }[tone]
  return (
    <div role={tone === 'green' ? 'status' : 'alert'} className={`mt-3 rounded-xl border px-4 py-3 ${styles}`}>
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-0.5 text-sm opacity-90">{text}</p>
    </div>
  )
}
