'use client'

import { useState } from 'react'
import Link from 'next/link'
import Button from '@/components/admin/ui/Button'
import Field, { inputClass } from '@/components/admin/ui/Field'
import type { ValidateResult, CustomerSummary } from '@/lib/game'

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

/** The owner's day-to-day console: validate a code, credit a purchase, look up a customer. */
export default function CaisseConsole() {
  return (
    <div className="space-y-5">
      <ValidateCard />
      <AwardCard />
      <LookupCard />
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
      <p className="mt-0.5 text-sm text-zinc-500">Le client montre son code — vérifiez-le, puis marquez-le comme récupéré.</p>
      <div className="mt-4 flex gap-2">
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setResult(null) }}
          onKeyDown={(e) => e.key === 'Enter' && check()}
          placeholder="K7F-3QZ"
          autoCapitalize="characters"
          autoComplete="off"
          className={`${inputClass} font-mono text-base tracking-[0.2em]`}
        />
        <Button variant="primary" onClick={check} disabled={busy} className="shrink-0">
          {busy ? '…' : 'Vérifier'}
        </Button>
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
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
        <button
          type="button"
          onClick={onCollect}
          disabled={collecting}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-green-700 active:scale-[0.99] disabled:opacity-60"
        >
          {collecting ? 'Validation…' : '✓ Marquer comme récupéré'}
        </button>
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

/* ── Credit a purchase ───────────────────────────────────────────── */
function AwardCard() {
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'green' | 'red'; text: string } | null>(null)

  async function submit() {
    setBusy(true)
    setMsg(null)
    const { ok, json } = await caisse('award', { phone, amount: Number(amount) })
    setBusy(false)
    if (!ok || !json.ok) {
      setMsg({ tone: 'red', text: json.error || 'Erreur.' })
      return
    }
    const welcome = json.welcomeAdded ? ` (+${json.welcomeAdded} bienvenue)` : ''
    setMsg({ tone: 'green', text: `✓ +${json.pointsAdded} points${welcome} · solde ${json.balance}` })
    setAmount('')
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="font-bold text-zinc-900">Créditer un achat</h2>
      <p className="mt-0.5 text-sm text-zinc-500">Le client donne son numéro — saisissez le montant de l’addition.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
        <Field label="Téléphone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+216 …" inputMode="tel" className={inputClass} />
        </Field>
        <Field label="Addition (TND)">
          <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="25" inputMode="decimal" className={inputClass} />
        </Field>
        <Button variant="primary" onClick={submit} disabled={busy || !phone || !amount} className="sm:mb-0">
          {busy ? '…' : 'Créditer'}
        </Button>
      </div>
      {msg && <p className={`mt-3 text-sm font-medium ${msg.tone === 'green' ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
    </div>
  )
}

/* ── Look up a customer ──────────────────────────────────────────── */
function LookupCard() {
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [data, setData] = useState<(CustomerSummary & { phone: string }) | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setErr(null)
    setData(null)
    const { ok, json } = await caisse('lookup', { phone })
    setBusy(false)
    if (!ok) {
      setErr(json.error || 'Erreur.')
      return
    }
    setData(json)
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="font-bold text-zinc-900">Rechercher un client</h2>
      <p className="mt-0.5 text-sm text-zinc-500">Voir le solde de points, l’historique et les codes encore valables.</p>
      <div className="mt-4 flex gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="+216 …"
          inputMode="tel"
          className={inputClass}
        />
        <Button variant="neutral" onClick={submit} disabled={busy || !phone} className="shrink-0">
          {busy ? '…' : 'Chercher'}
        </Button>
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      {data && (
        <div className="mt-4 space-y-4">
          <div className="flex items-baseline justify-between rounded-xl bg-zinc-50 px-4 py-3">
            <span className="text-sm text-zinc-500">{data.phone}</span>
            <span className="text-lg font-bold text-zinc-900">
              {data.balance} <span className="text-sm font-medium text-zinc-400">points</span>
            </span>
          </div>

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

          {data.recent.length > 0 && (
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
                    <span className={`font-semibold ${t.delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {t.delta >= 0 ? `+${t.delta}` : t.delta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.balance === 0 && data.recent.length === 0 && (
            <p className="text-sm text-zinc-400">Aucune activité pour ce numéro.</p>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-zinc-400">
        Configurer les lots et récompenses : <Link href="/admin/game" className="font-semibold text-orange-600 hover:underline">Programme de fidélité →</Link>
      </p>
    </div>
  )
}

/* ── shared status banner ────────────────────────────────────────── */
function Banner({ tone, title, text }: { tone: 'green' | 'amber' | 'red'; title: string; text: string }) {
  const styles = {
    green: 'border-green-200 bg-green-50 text-green-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-red-200 bg-red-50 text-red-700',
  }[tone]
  return (
    <div className={`mt-3 rounded-xl border px-4 py-3 ${styles}`}>
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-0.5 text-sm opacity-90">{text}</p>
    </div>
  )
}
