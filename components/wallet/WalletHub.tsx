'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DinerAuth, { type DinerSession } from '@/components/game/DinerAuth'

/**
 * WalletHub — "Portefeuille fidélité": ONE login, ALL the diner's cafés. Identity
 * is global (phone + 4-digit PIN), so a single token unlocks every café the phone
 * has loyalty activity at. Each café keeps its OWN points / roulette / rewards —
 * we just list them here and drill into each café's EXISTING hub.
 *
 * Bridge to the per-café hub: FidelityHub reads its token from
 * localStorage['scaniha_diner_<slug>']. Because the token is global, tapping a
 * card seeds that per-slug key with the wallet token and navigates to
 * /<slug>/fidelite — reusing the entire loyalty engine unchanged.
 */

interface WalletCafe {
  slug: string
  name: string
  logo_url: string | null
  accent: string
  balance: number
  has_roulette: boolean
  has_loyalty: boolean
  active_wins: number
}

const WALLET_KEY = 'scaniha_wallet'
const BG = '#FAF8F5', INK = '#1A1410', MUT = '#8C8378', FAINT = '#B7AFA4'
const ORANGE = '#F47B20'
const SOFT = '0 1px 2px rgba(0,0,0,0.04), 0 12px 30px -20px rgba(0,0,0,0.3)'

function readToken(): string | null { try { return localStorage.getItem(WALLET_KEY) } catch { return null } }
function clearToken() { try { localStorage.removeItem(WALLET_KEY) } catch {} }

function modeLabel(c: WalletCafe): string {
  if (c.has_roulette && c.has_loyalty) return 'Roue + Points'
  if (c.has_roulette) return 'Roue'
  if (c.has_loyalty) return 'Points'
  return 'Fidélité'
}

type Phase = 'loading' | 'auth' | 'ready'

export default function WalletHub() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('loading')
  const [token, setToken] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  const [cafes, setCafes] = useState<WalletCafe[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (tok: string) => {
    try {
      const res = await fetch('/api/wallet', { headers: { Authorization: `Bearer ${tok}` } })
      if (res.status === 401) { clearToken(); setToken(null); setPhase('auth'); return }
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) { setError('Impossible de charger votre portefeuille.'); setPhase('ready'); return }
      setName(json.name ?? null); setCafes(Array.isArray(json.cafes) ? json.cafes : []); setPhase('ready')
    } catch { setError('Connexion impossible. Vérifiez votre réseau.'); setPhase('ready') }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const tok = readToken()
      if (!tok) { if (!cancelled) setPhase('auth'); return }
      if (cancelled) return
      setToken(tok)
      await load(tok)
    })()
    return () => { cancelled = true }
  }, [load])

  function onAuthed(s: DinerSession) { setToken(s.token); setName(s.name); setPhase('loading'); load(s.token) }

  function openCafe(slug: string) {
    if (token) { try { localStorage.setItem(`scaniha_diner_${slug}`, token) } catch {} }
    router.push(`/${slug}/fidelite`)
  }

  async function logout() {
    const tok = token ?? readToken(); clearToken(); setToken(null); setCafes([]); setName(null)
    if (tok) { try { await fetch('/api/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout', token: tok }) }) } catch {} }
    setPhase('auth')
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="mx-auto min-h-[100svh] max-w-md px-[18px] pt-6" style={{ background: BG }} aria-busy="true">
        <div className="mb-6 space-y-2">
          <div className="wl-sk h-5 w-40 rounded-full" />
          <div className="wl-sk h-3 w-24 rounded-full" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="wl-sk h-[92px] w-full rounded-[22px]" />)}
        </div>
        <style jsx>{`
          .wl-sk { position: relative; overflow: hidden; background: #ECE7E0; }
          .wl-sk::after { content: ''; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent); animation: wl-sh 1.4s ease-in-out infinite; }
          @keyframes wl-sh { 100% { transform: translateX(100%) } }
          @media (prefers-reduced-motion: reduce) { .wl-sk::after { animation: none } }
        `}</style>
      </div>
    )
  }

  // ── Auth (café-less wallet login) ────────────────────────────────────────────
  if (phase === 'auth') {
    return (
      <div className="mx-auto flex min-h-[100svh] max-w-md flex-col px-5 pb-10" style={{ background: BG }}>
        <div className="flex flex-1 flex-col justify-center pb-10">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-3xl" style={{ backgroundColor: `${ORANGE}1a` }} aria-hidden="true">💳</div>
            <h1 className="mt-4 text-2xl font-bold" style={{ color: INK }}>Votre portefeuille fidélité</h1>
            <p className="mx-auto mt-2 max-w-[18rem] text-sm leading-relaxed" style={{ color: MUT }}>
              Un seul compte pour tous vos cafés. Connectez-vous avec votre numéro et votre code à 4 chiffres.
            </p>
          </div>
          <DinerAuth onAuthed={onAuthed} />
        </div>
      </div>
    )
  }

  // ── Ready ─────────────────────────────────────────────────────────────────
  const total = cafes.reduce((s, c) => s + (c.balance || 0), 0)
  const greeting = name || 'à vous'

  return (
    <div className="mx-auto min-h-[100svh] max-w-md pb-16" style={{ background: BG }}>
      <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5" style={{ background: 'rgba(250,248,245,0.85)', backdropFilter: 'blur(8px)' }}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: FAINT }}>Portefeuille</span>
        <button type="button" onClick={logout} className="text-xs font-medium" style={{ color: MUT }}>Se déconnecter</button>
      </header>

      <div className="px-[18px] pt-1">
        <div className="mb-5 px-0.5">
          <h1 className="text-[22px] font-bold leading-tight" style={{ color: INK }}>Bonjour, {greeting}</h1>
          {cafes.length > 0 && (
            <p className="mt-1 text-sm" style={{ color: MUT }}>
              <span className="font-semibold" style={{ color: INK }}>{total}</span> points au total · {cafes.length} café{cafes.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {error && <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-center text-sm text-red-700">{error}</p>}

        {cafes.length === 0 ? (
          <div className="mt-6 rounded-[22px] bg-white px-6 py-12 text-center" style={{ boxShadow: SOFT }}>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-3xl" style={{ backgroundColor: `${ORANGE}14` }} aria-hidden="true">📷</div>
            <h2 className="mt-4 text-lg font-semibold" style={{ color: INK }}>Aucun café pour l’instant</h2>
            <p className="mx-auto mt-1.5 max-w-[16rem] text-sm leading-relaxed" style={{ color: MUT }}>
              Scannez le QR d’un café participant pour commencer à cumuler des points — ils apparaîtront ici automatiquement.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {cafes.map((c) => (
              <li key={c.slug}>
                <button
                  type="button"
                  onClick={() => openCafe(c.slug)}
                  className="flex w-full items-center gap-3.5 rounded-[22px] bg-white p-3.5 text-left transition active:scale-[0.99]"
                  style={{ boxShadow: SOFT }}
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-xl font-bold" style={{ backgroundColor: `${c.accent}14`, color: c.accent }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {c.logo_url ? <img src={c.logo_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : (c.name?.trim()?.[0] || '•').toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate text-[15px] font-semibold" style={{ color: INK }}>{c.name}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${c.accent}1a`, color: c.accent }}>{modeLabel(c)}</span>
                      {c.active_wins > 0 && <span className="text-[11px] font-medium" style={{ color: MUT }}>🎁 {c.active_wins} bon{c.active_wins > 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  {c.has_loyalty ? (
                    <div className="shrink-0 text-right">
                      <div className="text-[22px] font-bold leading-none tabular-nums" style={{ color: c.accent }}>{c.balance}</div>
                      <div className="text-[10px] font-medium" style={{ color: FAINT }}>points</div>
                    </div>
                  ) : (
                    <div className="shrink-0 text-right">
                      <div className="text-2xl leading-none" aria-hidden="true">🎰</div>
                      <div className="mt-0.5 text-[10px] font-medium" style={{ color: FAINT }}>tourner</div>
                    </div>
                  )}
                  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke={FAINT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 text-center text-[11px] leading-relaxed" style={{ color: FAINT }}>
          Chaque café garde ses propres points et récompenses — gérés ici depuis un seul compte.
        </p>
      </div>
    </div>
  )
}
