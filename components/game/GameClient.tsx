'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import RouletteWheel from './RouletteWheel'
import Confetti from './Confetti'
import DinerAuth, { type DinerSession } from './DinerAuth'
import AccountSheet from './AccountSheet'
import RewardsStore from './RewardsStore'
import PlayGatesGate from './PlayGatesGate'
import type { GameGate } from '@/lib/game'

type Phase = 'loading' | 'inactive' | 'auth' | 'ready' | 'spinning' | 'won' | 'blocked'

interface SpinResult {
  prizeIndex: number
  prizeLabel: string
  code: string
  expiresAt: string
  pointsEarned?: number
  balance?: number
}

const KEY = (slug: string) => 'scaniha_diner_' + slug

function deviceId(): string {
  try {
    let id = localStorage.getItem('scaniha_device')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('scaniha_device', id)
    }
    return id
  } catch {
    return 'no-storage'
  }
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

export default function GameClient({ slug }: { slug: string }) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [prizes, setPrizes] = useState<string[]>([])
  const [businessName, setBusinessName] = useState('')
  // The roulette + account are a SCANIHA feature → always the Scaniha brand
  // orange, NOT the café owner's custom menu colour/gradient.
  const accent = '#F47B20'
  const gradient = 'linear-gradient(135deg, #F47B20, #F5B82E)'
  const [loyaltyActive, setLoyaltyActive] = useState(false)
  const [session, setSession] = useState<DinerSession | null>(null)
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [result, setResult] = useState<SpinResult | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [storeOpen, setStoreOpen] = useState(false)
  const [winModalOpen, setWinModalOpen] = useState(false)
  const [pendingSpin, setPendingSpin] = useState(false)
  const [gates, setGates] = useState<GameGate[]>([])
  const [gatesCleared, setGatesCleared] = useState(false)
  const [gatesModalOpen, setGatesModalOpen] = useState(false)

  // If this device already cleared the gates, don't ask again.
  useEffect(() => {
    if (gates.length === 0) return
    try {
      if (gates.every((g) => localStorage.getItem(`scaniha_gate_${slug}_${g.id}`))) setGatesCleared(true)
    } catch {}
  }, [gates, slug])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/game/${slug}`)
        const json = await res.json()
        if (cancelled) return
        setLoyaltyActive(Boolean(json.loyaltyActive))
        if (!json.active) {
          setPhase('inactive')
          return
        }
        setPrizes(json.prizes)
        setBusinessName(json.businessName || '')
        setGates(Array.isArray(json.gates) ? json.gates : [])

        // Validate any stored session token, then decide auth vs ready.
        const token = readToken(slug)
        let authed: DinerSession | null = null
        if (token) {
          try {
            const meRes = await fetch(`/api/account/${slug}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'me', token }),
            })
            const me = await meRes.json().catch(() => ({}))
            if (meRes.ok && me?.ok) {
              authed = { token, phone: me.phone, name: me.name ?? null }
            } else {
              clearToken(slug)
            }
          } catch {
            clearToken(slug)
          }
        }
        if (cancelled) return

        if (authed) {
          setSession(authed)
          // Restore an unexpired win for this account, if any.
          try {
            const saved = localStorage.getItem(`scaniha_win_${slug}`)
            if (saved) {
              const w = JSON.parse(saved) as SpinResult
              if (new Date(w.expiresAt) > new Date()) {
                setResult(w)
                setRevealed(true)
                setPhase('won')
                return
              }
              localStorage.removeItem(`scaniha_win_${slug}`)
            }
          } catch {}
          setPhase('ready')
        } else {
          // Play-first: show the wheel even when logged out; auth is asked only on spin.
          setPhase('ready')
        }
      } catch {
        if (!cancelled) setPhase('inactive')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  function onAuthed(s: DinerSession) {
    setSession(s)
    setAuthMessage(null)
    setError(null)
    setPhase('ready')
    // They tapped "Tourner la roue" before having an account → spin now, for real.
    if (pendingSpin) {
      setPendingSpin(false)
      spin(s.token)
    }
  }

  function requireLogin(message?: string) {
    clearToken(slug)
    setSession(null)
    setResult(null)
    setRevealed(false)
    setConfetti(false)
    setAccountOpen(false)
    setAuthMessage(message ?? null)
    setPhase('auth')
  }

  async function logout() {
    const token = session?.token ?? readToken(slug)
    clearToken(slug)
    try {
      localStorage.removeItem(`scaniha_win_${slug}`)
    } catch {}
    if (token) {
      try {
        await fetch(`/api/account/${slug}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'logout', token }),
        })
      } catch {}
    }
    setSession(null)
    setResult(null)
    setRevealed(false)
    setConfetti(false)
    setAccountOpen(false)
    setAuthMessage(null)
    setError(null)
    setPhase('auth')
  }

  async function spin(tokenOverride?: string, gatesOk?: boolean) {
    // Conditions first: if not cleared, open the gates popup instead of spinning.
    if (!gatesOk && gates.length > 0 && !gatesCleared) {
      setGatesModalOpen(true)
      return
    }
    const token = tokenOverride ?? session?.token
    if (!token) {
      // Play-first: let them see the wheel, ask to sign in/up only on the spin.
      setPendingSpin(true)
      requireLogin('Connectez-vous pour tourner la roue — vos gains et points sont gardés sur votre compte.')
      return
    }
    setError(null)
    setPhase('spinning')
    try {
      const res = await fetch(`/api/game/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: deviceId(), token }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        if (res.status === 401 || json.authRequired) {
          requireLogin('Votre session a expiré. Reconnectez-vous pour jouer.')
          return
        }
        // QR-session gate (403 rescanRequired): the scan expired or they never
        // scanned. Stay on 'ready' (not 'blocked' — that's the daily-limit
        // countdown) so the spin button remains once they re-scan the café QR.
        setPhase(res.status === 429 ? 'blocked' : 'ready')
        setError(json.error || 'Une erreur est survenue. Réessayez.')
        return
      }
      const w: SpinResult = json
      setResult(w)
      try {
        localStorage.setItem(`scaniha_win_${slug}`, JSON.stringify(w))
      } catch {}
      // wheel animates now; reveal happens onSpinEnd
    } catch {
      setPhase('ready')
      setError('Connexion impossible. Vérifiez votre réseau.')
    }
  }

  function copyCode() {
    if (!result) return
    navigator.clipboard?.writeText(result.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (phase === 'loading') {
    return (
      <div className="flex min-h-[100svh] flex-col items-center justify-center gap-5 bg-white px-6 text-center">
        <span className="relative flex h-16 w-16 items-center justify-center" aria-hidden="true">
          <span className="gl-ping absolute inset-0 rounded-full" style={{ backgroundColor: `${accent}1f` }} />
          <svg viewBox="0 0 40 40" width="60" height="60" className="gl-spin">
            <circle cx="20" cy="20" r="16" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeDasharray="4 6" />
            <g stroke={accent} strokeWidth="1.6" strokeLinecap="round">
              <line x1="20" y1="20" x2="20" y2="6" /><line x1="20" y1="20" x2="32" y2="13" /><line x1="20" y1="20" x2="32" y2="27" /><line x1="20" y1="20" x2="20" y2="34" /><line x1="20" y1="20" x2="8" y2="27" /><line x1="20" y1="20" x2="8" y2="13" />
            </g>
            <circle cx="20" cy="20" r="3.2" fill={accent} />
          </svg>
        </span>
        <p className="gl-pulse text-sm font-medium text-[#8A8178]">Chargement du jeu…</p>
        <style jsx>{`
          @keyframes gl-spin { to { transform: rotate(360deg) } }
          @keyframes gl-ping { 0% { transform: scale(0.85); opacity: 0.7 } 100% { transform: scale(1.8); opacity: 0 } }
          @keyframes gl-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.45 } }
          .gl-spin { transform-origin: 50% 50%; animation: gl-spin 1.1s linear infinite }
          .gl-ping { animation: gl-ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite }
          .gl-pulse { animation: gl-pulse 1.6s ease-in-out infinite }
          @media (prefers-reduced-motion: reduce) {
            .gl-spin, .gl-ping, .gl-pulse { animation: none !important }
            .gl-ping { display: none }
          }
        `}</style>
      </div>
    )
  }

  if (phase === 'inactive') {
    return (
      <div className="bg-white px-6 py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border text-3xl" style={{ borderColor: '#ECE7DF', backgroundColor: '#FAFAF9' }}>🎡</div>
        <h1 className="mt-5 text-xl font-medium text-[#1B1714]">Pas de jeu pour le moment</h1>
        <p className="mt-2 text-sm text-[#8A8178]">Revenez bientôt — la roue de la chance arrive.</p>
        <Link
          href={`/${slug}`}
          className="mt-6 inline-block rounded-2xl border px-5 py-2.5 text-sm font-medium text-[#1B1714] transition hover:bg-[#FAFAF9]"
          style={{ borderColor: '#ECE7DF' }}
        >
          ← Retour au menu
        </Link>
      </div>
    )
  }

  if (phase === 'auth') {
    return (
      <div className="mx-auto flex min-h-[100svh] max-w-md flex-col bg-white px-5 pb-10">
        {/* Back button — top-left, easy to find. */}
        <header className="py-4">
          <Link
            href={`/${slug}`}
            aria-label="Retour au menu"
            className="inline-flex h-11 items-center gap-1 rounded-full border bg-white pe-3.5 ps-2.5 text-sm font-medium text-[#1B1714] transition hover:bg-[#FAFAF9] active:scale-95"
            style={{ borderColor: '#ECE7DF', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Retour
          </Link>
        </header>

        {/* Centered hero + auth card. */}
        <div className="flex flex-1 flex-col justify-center pb-6">
          <div className="text-center">
            {businessName && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#8A8178]">{businessName}</p>
            )}
            <div className="mx-auto mt-3 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl" style={{ backgroundColor: `${accent}1a` }} aria-hidden="true">🎡</div>
            <h1 className="mt-4 text-2xl font-bold text-[#1B1714]">Créez votre compte pour jouer</h1>
            <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-[#8A8178]">
              Inscrivez-vous en quelques secondes — vos gains et vos points de fidélité sont gardés sur votre compte.
            </p>
          </div>
          {authMessage && (
            <p className="mx-auto mt-5 max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
              {authMessage}
            </p>
          )}
          <div className="mt-6">
            <DinerAuth slug={slug} accent={accent} gradient={gradient} onAuthed={onAuthed} />
          </div>
        </div>
      </div>
    )
  }

  const played = phase === 'won' || phase === 'blocked'
  const greeting = session?.name || session?.phone || ''

  return (
    <div className="mx-auto flex min-h-[100svh] max-w-md flex-col bg-white px-5 pb-6">
      {confetti && <Confetti accent={accent} />}

      {/* Top bar: ← Retour (left) · business name (center) · Mon compte (right) */}
      <header className="flex items-center gap-3 py-4">
        <Link
          href={`/${slug}`}
          aria-label="Retour au menu"
          className="flex h-11 shrink-0 items-center gap-1 rounded-full border bg-white pe-3.5 ps-2.5 text-sm font-medium text-[#1B1714] transition hover:bg-[#FAFAF9] active:scale-95"
          style={{ borderColor: '#ECE7DF', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Retour
        </Link>

        <p className="min-w-0 flex-1 truncate text-center text-xs font-medium uppercase tracking-[0.22em] text-[#8A8178]">
          {businessName || 'Scaniha'}
        </p>

        <div className="flex shrink-0 items-center gap-2">
          {loyaltyActive && (
            <button
              type="button"
              onClick={() => setStoreOpen(true)}
              aria-label="Boutique — échangez vos points"
              title="Boutique"
              className="flex h-11 w-11 items-center justify-center rounded-full border bg-white text-[#1B1714] transition active:scale-95"
              style={{ borderColor: '#ECE7DF', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: accent }}>
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </button>
          )}
          {session ? (
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              aria-label="Mon compte"
              className="flex h-11 w-11 items-center justify-center rounded-full border bg-white text-[#1B1714] transition active:scale-95"
              style={{ borderColor: '#ECE7DF', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: accent }}>
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          ) : (
            !loyaltyActive && <span className="h-11 w-11" aria-hidden="true" />
          )}
        </div>
      </header>

      {/* Title · wheel · action — one compact, vertically-centred cluster so the
          spin button sits right under the wheel instead of stranded at the bottom. */}
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-2">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-[#1B1714]">Roue de la chance</h1>
          {greeting && <p className="mt-1.5 text-sm font-medium text-[#1B1714]">Bonjour {greeting}</p>}
          {!played && (
            <p className="mx-auto mt-1.5 max-w-[18rem] text-sm leading-relaxed text-[#8A8178]">
              Tournez la roue — tout le monde gagne quelque chose.
            </p>
          )}
        </div>

        <RouletteWheel
          prizes={prizes}
          accent={accent}
          spinning={phase === 'spinning' && result !== null}
          targetIndex={result ? result.prizeIndex : null}
          onSpinEnd={() => {
            if (result) {
              setRevealed(true)
              setConfetti(true)
              setPhase('won')
              setWinModalOpen(true)
            }
          }}
        />

        {/* Action — directly under the wheel, full width. */}
        <div className="w-full">
        {!played ? (
          <>
            <button
              type="button"
              onClick={() => spin()}
              disabled={phase === 'spinning'}
              className="block w-full rounded-2xl py-4 text-base font-medium text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: accent, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              {phase === 'spinning' ? 'La roue tourne…' : 'Tourner la roue'}
            </button>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-[#8A8178]">
              Une partie par jour — vos gains et points sont liés à votre compte.
            </p>
            {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p>}
          </>
        ) : (
          <div className="space-y-3">
            {phase === 'blocked' && error && (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">{error}</p>
            )}
            <NextSpinCountdown accent={accent} />
            <div className="flex flex-col gap-2.5">
              {phase === 'won' && result && (
                <button
                  type="button"
                  onClick={() => setWinModalOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl border bg-white py-3.5 text-sm font-semibold text-[#1B1714] transition hover:bg-[#FAFAF9] active:scale-[0.99]"
                  style={{ borderColor: '#ECE7DF' }}
                >
                  🎁 Revoir mon gain
                </button>
              )}
              {session && (
                <button
                  type="button"
                  onClick={() => setAccountOpen(true)}
                  className="rounded-2xl py-3.5 text-sm font-medium text-white transition active:scale-[0.99]"
                  style={{ backgroundColor: accent, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                >
                  Mon compte
                </button>
              )}
              <Link
                href={`/${slug}`}
                className="rounded-2xl border bg-white py-3.5 text-center text-sm font-medium text-[#1B1714] transition hover:bg-[#FAFAF9]"
                style={{ borderColor: '#ECE7DF' }}
              >
                ← Retour au menu
              </Link>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Quiet logout */}
      {session && (
        <div className="shrink-0 pt-4 text-center">
          <button type="button" onClick={logout} className="text-xs font-medium text-[#8A8178] underline-offset-2 hover:underline">
            Se déconnecter
          </button>
        </div>
      )}

      {/* Win popup — celebratory, unmissable. */}
      {phase === 'won' && result && revealed && winModalOpen && (
        <WinModal
          result={result}
          accent={accent}
          copied={copied}
          onCopy={copyCode}
          slug={slug}
          onAccount={() => { setWinModalOpen(false); setAccountOpen(true) }}
          onClose={() => setWinModalOpen(false)}
        />
      )}

      {/* Account sheet */}
      {accountOpen && session && (
        <AccountSheet
          slug={slug}
          session={session}
          accent={accent}
          gradient={gradient}
          onClose={() => setAccountOpen(false)}
        />
      )}

      {/* Boutique — redeem points for rewards */}
      {storeOpen && (
        <RewardsStore
          slug={slug}
          session={session}
          accent={accent}
          gradient={gradient}
          onClose={() => setStoreOpen(false)}
          onRequireLogin={() => {
            setStoreOpen(false)
            requireLogin('Connectez-vous pour échanger vos points contre des récompenses.')
          }}
        />
      )}

      {/* Play-gates popup — opens when the player taps "Tourner la roue" while
          conditions are still unmet. Clearing them all auto-starts the spin. */}
      {gatesModalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setGatesModalOpen(false)}
        >
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <PlayGatesGate
              gates={gates}
              slug={slug}
              deviceId={deviceId()}
              accent={accent}
              gradient={gradient}
              onAllDone={() => {
                setGatesCleared(true)
                setGatesModalOpen(false)
                spin(undefined, true)
              }}
            />
            <button
              type="button"
              onClick={() => setGatesModalOpen(false)}
              className="mt-3 block w-full rounded-2xl bg-white/90 py-3 text-sm font-medium text-[#8A8178] shadow-sm transition hover:bg-white"
            >
              Plus tard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Win popup — the celebratory reveal, so a win can never be missed ──────── */
function WinModal({
  result,
  accent,
  copied,
  onCopy,
  onAccount,
  slug,
  onClose,
}: {
  result: SpinResult
  accent: string
  copied: boolean
  onCopy: () => void
  onAccount: () => void
  slug: string
  onClose: () => void
}) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 sm:items-center sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <Confetti accent={accent} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Vous avez gagné"
        className="relative w-full max-w-sm overflow-hidden rounded-t-3xl bg-white px-6 pb-7 pt-8 text-center shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.35)] animate-[winpop_.3s_cubic-bezier(0.16,0.84,0.3,1)] sm:rounded-3xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-[#8A8178] transition hover:bg-[#FAFAF9]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl" style={{ backgroundColor: `${accent}1a` }}>🎉</div>
        <h2 className="mt-3 text-2xl font-bold text-[#1B1714]">Vous avez gagné&nbsp;!</h2>
        <p className="mt-1 text-lg font-semibold" style={{ color: accent }}>{result.prizeLabel}</p>

        <button
          type="button"
          onClick={onCopy}
          className="mx-auto mt-5 flex w-fit items-center gap-2.5 rounded-2xl border bg-[#FAFAF9] px-6 py-3 font-mono text-2xl font-bold tracking-[0.2em] text-[#1B1714] transition hover:bg-white"
          style={{ borderColor: '#ECE7DF' }}
          title="Copier le code"
        >
          {result.code}
          <span className="font-sans text-xs font-medium tracking-normal text-[#8A8178]">{copied ? 'copié ✓' : 'copier'}</span>
        </button>

        <p className="mt-3 text-xs leading-relaxed text-[#8A8178]">
          Montrez ce code au personnel pour récupérer votre gain.
          <br />
          Valable jusqu’au {new Date(result.expiresAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.
        </p>

        {/* No "+points" cue here — the roulette only hands out a prize CODE.
            Points are earned solely at the caisse (on purchases), so we never
            advertise points on a spin even though the backend may still log a
            small loyalty bonus. */}

        {/* The next-play countdown — now front-and-centre, not a tiny footer line. */}
        <NextSpinCountdown accent={accent} />

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onAccount}
            className="rounded-2xl py-3.5 text-sm font-medium text-white transition active:scale-[0.99]"
            style={{ backgroundColor: accent, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            Mon compte
          </button>
          <Link
            href={`/${slug}`}
            className="rounded-2xl border bg-white py-3.5 text-sm font-medium text-[#1B1714] transition hover:bg-[#FAFAF9]"
            style={{ borderColor: '#ECE7DF' }}
          >
            ← Retour au menu
          </Link>
        </div>

        <style jsx global>{`
          @keyframes winpop {
            from { opacity: 0; transform: translateY(28px) scale(0.96) }
            to { opacity: 1; transform: translateY(0) scale(1) }
          }
        `}</style>
      </div>
    </div>
  )
}

/* ── Next-spin countdown — the daily limit resets at midnight (Africa/Tunis) ── */
function msUntilTunisReset(): number {
  const now = new Date()
  const tunisNow = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Tunis' }))
  const mid = new Date(tunisNow)
  mid.setHours(24, 0, 0, 0)
  return Math.max(0, mid.getTime() - tunisNow.getTime())
}
function fmtCountdown(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`
  if (m > 0) return `${m}m ${sec.toString().padStart(2, '0')}s`
  return `${sec}s`
}
function NextSpinCountdown({ accent, compact = false }: { accent: string; compact?: boolean }) {
  const [ms, setMs] = useState<number | null>(null)
  useEffect(() => {
    setMs(msUntilTunisReset())
    const id = setInterval(() => setMs(msUntilTunisReset()), 1000)
    return () => clearInterval(id)
  }, [])
  if (ms === null) return null
  if (compact) {
    return (
      <p className="mt-3 text-center text-xs text-[#8A8178]">
        Prochaine partie dans <span className="font-medium tabular-nums" style={{ color: accent }}>{fmtCountdown(ms)}</span>
      </p>
    )
  }
  return (
    <div className="mt-5 rounded-2xl border bg-white px-4 py-4 text-center" style={{ borderColor: '#ECE7DF', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#8A8178]">Prochaine partie dans</p>
      <p className="mt-1 text-3xl font-medium tabular-nums" style={{ color: accent }}>{fmtCountdown(ms)}</p>
      <p className="mt-1 text-[11px] text-[#8A8178]">Une partie par jour — revenez demain&nbsp;!</p>
    </div>
  )
}
