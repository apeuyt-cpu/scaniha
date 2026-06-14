'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { CustomerSummary } from '@/lib/game'

interface Reward {
  id: string
  label: string
  points_cost: number
}

const KEY = (slug: string) => 'scaniha_diner_' + slug

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

function readToken(slug: string): string | null {
  try {
    return localStorage.getItem(KEY(slug))
  } catch {
    return null
  }
}

function clearToken(slug: string) {
  try {
    localStorage.removeItem(KEY(slug))
  } catch {}
}

export default function LoyaltyClient({ slug }: { slug: string }) {
  // 'guest' = not logged in (prompt to connect); 'view' = account loaded.
  const [phase, setPhase] = useState<'loading' | 'inactive' | 'guest' | 'view'>('loading')
  const [businessName, setBusinessName] = useState('')
  const [accent, setAccent] = useState('#F47B20')
  const [rewards, setRewards] = useState<Reward[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState<string | null>(null)
  const [summary, setSummary] = useState<CustomerSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [redeemed, setRedeemed] = useState<{ code: string; rewardLabel: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const cfgRes = await fetch(`/api/loyalty/${slug}`)
        const cfg = await cfgRes.json()
        if (cancelled) return
        if (cfg.accent) setAccent(cfg.accent)
        if (!cfg.active) {
          setPhase('inactive')
          return
        }
        setBusinessName(cfg.businessName || '')
        setRewards(cfg.rewards || [])

        // Session-driven: validate the stored token → phone, then load summary.
        const stored = readToken(slug)
        if (!stored) {
          setPhase('guest')
          return
        }
        try {
          const meRes = await fetch(`/api/account/${slug}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'me', token: stored }),
          })
          const me = await meRes.json().catch(() => ({}))
          if (cancelled) return
          if (!meRes.ok || !me?.ok) {
            clearToken(slug)
            setPhase('guest')
            return
          }
          setToken(stored)
          setName(me.name ?? null)
          setPhone(me.phone)
          await loadSummary(me.phone)
          if (!cancelled) setPhase('view')
        } catch {
          if (!cancelled) {
            clearToken(slug)
            setPhase('guest')
          }
        }
      } catch {
        if (!cancelled) setPhase('inactive')
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  async function loadSummary(p: string) {
    const res = await fetch(`/api/loyalty/${slug}?phone=${encodeURIComponent(p)}`)
    const j = await res.json()
    if (!j.active) throw new Error('Programme indisponible')
    setSummary(j.summary || { balance: 0, recent: [], activeWins: [], activeRedemptions: [] })
  }

  async function refresh() {
    if (!phone) return
    try {
      await loadSummary(phone)
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion')
    }
  }

  async function logout() {
    const t = token ?? readToken(slug)
    clearToken(slug)
    if (t) {
      try {
        await fetch(`/api/account/${slug}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'logout', token: t }),
        })
      } catch {}
    }
    setToken(null)
    setSummary(null)
    setName(null)
    setPhone('')
    setRedeemed(null)
    setError(null)
    setPhase('guest')
  }

  async function redeem(reward: Reward) {
    if (!confirm(`Échanger ${reward.points_cost} points contre « ${reward.label} » ?`)) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/loyalty/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, rewardId: reward.id }),
      })
      const j = await res.json()
      if (!res.ok || !j.success) throw new Error(j.error || 'Échange impossible')
      setRedeemed({ code: j.code, rewardLabel: j.rewardLabel })
      await refresh() // refresh balance + active codes
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (phase === 'loading') return <p className="py-24 text-center text-sm text-zinc-400">Chargement…</p>

  if (phase === 'inactive') {
    return (
      <div className="px-6 py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-100 text-3xl">★</div>
        <h1 className="mt-5 text-xl font-bold text-zinc-900">Pas de programme de fidélité ici</h1>
        <p className="mt-2 text-sm text-zinc-500">Revenez bientôt !</p>
        <Link href={`/${slug}`} className="mt-6 inline-block rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white">
          ← Retour au menu
        </Link>
      </div>
    )
  }

  if (phase === 'guest') {
    return (
      <div className="mx-auto max-w-md px-5 pb-16 pt-8">
        <div className="text-center">
          {businessName && (
            <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: accent }}>{businessName}</p>
          )}
          <h1 className="mt-2 text-2xl font-extrabold text-zinc-900">Mon compte fidélité</h1>
        </div>
        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-7 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl" style={{ backgroundColor: `${accent}1a`, color: accent }}>★</div>
          <h2 className="mt-4 text-lg font-bold text-zinc-900">Connectez-vous à votre compte</h2>
          <p className="mt-1.5 text-sm text-zinc-500">
            Retrouvez vos points, vos codes gagnants et vos récompenses. Connectez-vous depuis la roue de la chance.
          </p>
          <Link
            href={`/${slug}/jeu`}
            className="mt-5 inline-block w-full rounded-2xl py-3.5 text-base font-extrabold text-white shadow-lg transition active:scale-[0.98]"
            style={{ backgroundColor: accent, boxShadow: `0 10px 24px -8px ${accent}99` }}
          >
            Se connecter pour jouer 🎡
          </Link>
        </div>
        <div className="mt-8 text-center">
          <Link href={`/${slug}`} className="text-sm font-semibold text-zinc-500">← Retour au menu</Link>
        </div>
      </div>
    )
  }

  const balance = summary?.balance ?? 0
  // next reward the customer is saving toward (cheapest they can't afford yet)
  const nextReward = rewards.filter((r) => r.points_cost > balance).sort((a, b) => a.points_cost - b.points_cost)[0]
  const activeCodes = summary
    ? [
        ...summary.activeWins.map((c) => ({ ...c, kind: 'Lot' })),
        ...summary.activeRedemptions.map((c) => ({ ...c, kind: 'Récompense' })),
      ]
    : []

  return (
    <div className="mx-auto max-w-md px-5 pb-16 pt-8">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: accent }}>{businessName}</p>
        <h1 className="mt-2 text-2xl font-extrabold text-zinc-900">Mon compte fidélité</h1>
      </div>

      {/* Balance */}
      <div className="mt-8 rounded-3xl p-6 text-center text-white shadow-xl" style={{ backgroundImage: `linear-gradient(135deg, ${accent}, ${accent}cc)`, boxShadow: `0 18px 40px -16px ${accent}` }}>
        <p className="text-sm font-medium text-white/85">{name || phone}</p>
        <p className="mt-1 text-5xl font-black">{balance}</p>
        <p className="mt-1 text-sm font-semibold text-white/90">points</p>
        {nextReward && (
          <div className="mx-auto mt-4 max-w-[15rem]">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/30">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${Math.min(100, Math.round((balance / nextReward.points_cost) * 100))}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-white/85">Encore {nextReward.points_cost - balance} pts pour « {nextReward.label} »</p>
          </div>
        )}
      </div>

      {redeemed && (
        <div className="mt-5 rounded-3xl border-2 bg-white p-5 text-center" style={{ borderColor: accent }}>
          <p className="text-2xl">🎁</p>
          <p className="mt-1 font-bold text-zinc-900">{redeemed.rewardLabel}</p>
          <div className="mx-auto mt-3 w-fit rounded-2xl bg-zinc-50 px-5 py-2.5 text-xl font-black tracking-[0.2em] text-zinc-900 ring-1 ring-inset ring-zinc-200">
            {redeemed.code}
          </div>
          <p className="mt-2 text-xs text-zinc-500">Montrez ce code au personnel pour récupérer votre récompense.</p>
        </div>
      )}

      {/* Active codes */}
      {activeCodes.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-400">Mes codes actifs</h2>
          <div className="mt-3 space-y-2">
            {activeCodes.map((c) => (
              <div key={c.code} className="flex items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                <div className="min-w-0">
                  <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-sm font-bold tracking-wider text-zinc-900">{c.code}</span>
                  <span className="ml-2 text-sm font-medium text-zinc-700">{c.label}</span>
                </div>
                <span className="shrink-0 text-[11px] text-zinc-400">exp. {fmt(c.expires_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rewards */}
      <div className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-400">Récompenses</h2>
        <div className="mt-3 space-y-2">
          {rewards.map((r) => {
            const affordable = balance >= r.points_cost
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
                <div>
                  <p className="font-semibold text-zinc-900">{r.label}</p>
                  <p className="text-xs font-bold" style={{ color: accent }}>★ {r.points_cost} points</p>
                </div>
                <button
                  type="button"
                  onClick={() => redeem(r)}
                  disabled={!affordable || busy}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-100"
                  style={affordable ? { backgroundColor: accent } : { backgroundColor: '#f4f4f5', color: '#a1a1aa' }}
                >
                  {affordable ? 'Échanger' : `Encore ${r.points_cost - balance} pts`}
                </button>
              </div>
            )
          })}
          {rewards.length === 0 && <p className="py-6 text-center text-sm text-zinc-400">Pas encore de récompenses.</p>}
        </div>
      </div>

      {/* History */}
      {summary && summary.recent.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-400">Historique</h2>
          <div className="mt-3 space-y-1.5">
            {summary.recent.map((t, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5 text-sm ring-1 ring-zinc-100">
                <span className="text-zinc-600">
                  {REASON_LABELS[t.reason] || t.reason}
                  {t.note ? ` · ${t.note}` : ''}
                </span>
                <span className={`font-bold ${t.delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {t.delta >= 0 ? `+${t.delta}` : t.delta}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p>}

      <div className="mt-8 flex justify-center gap-3">
        <Link href={`/${slug}`} className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white">← Retour au menu</Link>
        <Link href={`/${slug}/jeu`} className="rounded-xl border bg-white px-5 py-2.5 text-sm font-semibold" style={{ borderColor: accent, color: accent }}>
          🎡 Jouer
        </Link>
      </div>

      <div className="mt-6 text-center">
        <button type="button" onClick={logout} className="text-xs font-medium text-zinc-400 underline-offset-2 hover:underline">
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
