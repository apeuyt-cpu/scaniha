'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import DinerAuth, { type DinerSession } from '@/components/game/DinerAuth'
import type { CustomerSummary } from '@/lib/game'

interface Reward { id: string; label: string; points_cost: number }

const EMPTY: CustomerSummary = { balance: 0, recent: [], activeWins: [], activeRedemptions: [] }
const REASON: Record<string, string> = { purchase: 'Achat', play: 'Roue de la chance', welcome: 'Bienvenue', redeem: 'Récompense échangée', adjust: 'Ajustement' }
function fmt(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/**
 * The diner's account as a full PAGE (not a popup): a back button to the menu,
 * the points balance, claimable codes ("bons"), the rewards store, and history.
 * Scaniha-branded orange (the loyalty/game is a Scaniha feature).
 */
export default function ProfileClient({ slug, businessName }: { slug: string; businessName: string }) {
  const accent = '#F47B20'
  const gradient = 'linear-gradient(135deg, #F47B20, #F5B82E)'
  const [phase, setPhase] = useState<'loading' | 'auth' | 'ready'>('loading')
  const [session, setSession] = useState<DinerSession | null>(null)
  const [loyaltyActive, setLoyaltyActive] = useState(false)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [summary, setSummary] = useState<CustomerSummary>(EMPTY)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [redeemed, setRedeemed] = useState<{ code: string; rewardLabel: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Validate any stored session on mount.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let token: string | null = null
      try { token = localStorage.getItem('scaniha_diner_' + slug) } catch {}
      if (!token) { if (!cancelled) setPhase('auth'); return }
      try {
        const r = await fetch('/api/account/' + slug, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'me', token }) })
        const me = await r.json().catch(() => ({}))
        if (r.ok && me?.ok) { if (!cancelled) { setSession({ token, phone: me.phone, name: me.name ?? null }); setPhase('ready') } }
        else { try { localStorage.removeItem('scaniha_diner_' + slug) } catch {}; if (!cancelled) setPhase('auth') }
      } catch { if (!cancelled) setPhase('auth') }
    })()
    return () => { cancelled = true }
  }, [slug])

  const loadAccount = useCallback(async (phone: string) => {
    try {
      const r = await fetch(`/api/loyalty/${slug}?phone=${encodeURIComponent(phone)}`)
      const cfg = await r.json()
      setLoyaltyActive(Boolean(cfg.active))
      setRewards(cfg.active ? cfg.rewards || [] : [])
      setSummary(cfg.summary || EMPTY)
    } catch {}
  }, [slug])

  useEffect(() => { if (session) loadAccount(session.phone) }, [session, loadAccount])

  function onAuthed(s: DinerSession) { setSession(s); setError(null); setPhase('ready') }

  async function logout() {
    const token = session?.token
    try { localStorage.removeItem('scaniha_diner_' + slug) } catch {}
    if (token) { try { await fetch('/api/account/' + slug, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout', token }) }) } catch {} }
    setSession(null); setSummary(EMPTY); setRedeemed(null); setPhase('auth')
  }

  async function redeem(rw: Reward) {
    if (!session) return
    setBusyId(rw.id); setError(null)
    try {
      const r = await fetch('/api/loyalty/' + slug, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: session.phone, rewardId: rw.id }) })
      const j = await r.json()
      if (!r.ok || !j.success) throw new Error(j.error || 'Échange impossible.')
      setRedeemed({ code: j.code, rewardLabel: j.rewardLabel })
      await loadAccount(session.phone)
    } catch (e: any) { setError(e?.message || 'Échange impossible.') } finally { setBusyId(null) }
  }

  const balance = summary.balance ?? 0
  const activeCodes = [
    ...summary.activeWins.map((c) => ({ ...c, kind: 'Lot' })),
    ...summary.activeRedemptions.map((c) => ({ ...c, kind: 'Récompense' })),
  ]

  const Header = (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white/95 px-5 py-3 backdrop-blur" style={{ borderColor: '#ECE7DF' }}>
      <Link href={`/${slug}`} aria-label="Retour au menu" className="inline-flex h-10 items-center gap-1 rounded-full border bg-white pe-3.5 ps-2.5 text-sm font-medium text-[#1B1714] transition hover:bg-[#FAFAF9] active:scale-95" style={{ borderColor: '#ECE7DF' }}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        Menu
      </Link>
      <p className="min-w-0 flex-1 truncate text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#8A8178]">{businessName || 'Mon compte'}</p>
      <span className="h-10 w-[72px] shrink-0" aria-hidden="true" />
    </header>
  )

  if (phase === 'loading') {
    return <div className="mx-auto min-h-[100svh] max-w-md bg-white">{Header}<p className="py-24 text-center text-sm text-[#8A8178]">Chargement…</p></div>
  }

  if (phase === 'auth') {
    return (
      <div className="mx-auto min-h-[100svh] max-w-md bg-white">
        {Header}
        <div className="px-5 py-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${accent}1a`, color: accent }} aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-[#1B1714]">Votre compte</h1>
          <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-[#8A8178]">Connectez-vous pour suivre vos points, vos bons gagnés et vos récompenses.</p>
          <div className="mt-6"><DinerAuth slug={slug} accent={accent} gradient={gradient} onAuthed={onAuthed} /></div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-[100svh] max-w-md bg-white">
      {Header}
      <div className="space-y-6 px-5 pb-10 pt-5">
        {/* Balance card */}
        <div className="rounded-3xl p-6 text-white" style={{ backgroundImage: gradient }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">{session?.name || session?.phone}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-5xl font-extrabold leading-none tabular-nums">{balance}</span>
            <span className="text-sm font-medium text-white/85">points</span>
          </div>
        </div>

        {redeemed && (
          <div className="rounded-2xl border bg-white p-5 text-center" style={{ borderColor: '#ECE7DF' }}>
            <p className="font-semibold text-[#1B1714]">{redeemed.rewardLabel}</p>
            <div className="mx-auto mt-3 w-fit rounded-xl border bg-[#FAFAF9] px-5 py-2.5 font-mono text-xl font-bold tracking-[0.2em] text-[#1B1714]" style={{ borderColor: '#ECE7DF' }}>{redeemed.code}</div>
            <p className="mt-2 text-xs text-[#8A8178]">Montrez ce code au personnel pour récupérer votre récompense.</p>
          </div>
        )}

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p>}

        {/* Mes bons */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#8A8178]">Mes bons à utiliser</h2>
          {activeCodes.length > 0 ? (
            <div className="mt-3 space-y-2">
              {activeCodes.map((c) => (
                <div key={c.code} className="flex items-center justify-between gap-2 rounded-2xl border bg-white px-4 py-3" style={{ borderColor: '#ECE7DF' }}>
                  <div className="min-w-0">
                    <span className="rounded bg-[#FAFAF9] px-2 py-0.5 font-mono text-sm font-bold tracking-wider text-[#1B1714]">{c.code}</span>
                    <span className="ml-2 text-sm text-[#1B1714]">{c.label}</span>
                  </div>
                  <span className="shrink-0 text-[11px] text-[#8A8178]">exp. {fmt(c.expires_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-2xl border bg-[#FAFAF9] px-4 py-5 text-center text-sm text-[#8A8178]" style={{ borderColor: '#ECE7DF' }}>Aucun bon pour le moment. Tournez la roue pour gagner&nbsp;!</p>
          )}
        </section>

        {/* Boutique — rewards */}
        {loyaltyActive && rewards.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#8A8178]">Récompenses</h2>
            <div className="mt-3 space-y-2">
              {rewards.map((r) => {
                const affordable = balance >= r.points_cost
                const busy = busyId === r.id
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border p-4" style={{ borderColor: '#ECE7DF', backgroundColor: affordable ? '#fff' : '#FAFAF9' }}>
                    <div className="min-w-0">
                      <p className={`font-medium ${affordable ? 'text-[#1B1714]' : 'text-[#8A8178]'}`}>{r.label}</p>
                      <p className="text-xs font-medium" style={{ color: affordable ? accent : '#B8AFA4' }}>{r.points_cost} points</p>
                    </div>
                    {affordable ? (
                      <button type="button" onClick={() => redeem(r)} disabled={busy} className="shrink-0 rounded-xl px-4 py-2 text-xs font-bold text-white transition active:scale-[0.97] disabled:opacity-60" style={{ backgroundColor: accent }}>{busy ? '…' : 'Échanger'}</button>
                    ) : (
                      <span className="shrink-0 text-[#C8C0B5]" title={`Encore ${r.points_cost - balance} pts`} aria-label={`Encore ${r.points_cost - balance} points`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Historique */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#8A8178]">Historique</h2>
          {summary.recent.length > 0 ? (
            <div className="mt-3 space-y-1.5">
              {summary.recent.map((t, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-xl border bg-white px-4 py-2.5 text-sm" style={{ borderColor: '#ECE7DF' }}>
                  <div className="min-w-0">
                    <p className="truncate text-[#1B1714]">{REASON[t.reason] || t.reason}{t.note ? ` · ${t.note}` : ''}</p>
                    <p className="text-[11px] text-[#8A8178]">{fmt(t.created_at)}</p>
                  </div>
                  <span className={`shrink-0 font-medium ${t.delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>{t.delta >= 0 ? `+${t.delta}` : t.delta}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-2xl border bg-[#FAFAF9] px-4 py-5 text-center text-sm text-[#8A8178]" style={{ borderColor: '#ECE7DF' }}>Aucune activité pour le moment.</p>
          )}
        </section>

        <div className="pt-2 text-center">
          <button type="button" onClick={logout} className="text-xs font-medium text-[#8A8178] underline-offset-2 hover:underline">Se déconnecter</button>
        </div>
      </div>
    </div>
  )
}
