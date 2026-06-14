'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import RouletteWheel from './RouletteWheel'
import Confetti from './Confetti'
import DinerAuth, { type DinerSession } from './DinerAuth'

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
  const [accent, setAccent] = useState('#F47B20')
  const [loyaltyActive, setLoyaltyActive] = useState(false)
  const [session, setSession] = useState<DinerSession | null>(null)
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [result, setResult] = useState<SpinResult | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/game/${slug}`)
        const json = await res.json()
        if (cancelled) return
        if (json.accent) setAccent(json.accent)
        setLoyaltyActive(Boolean(json.loyaltyActive))
        if (!json.active) {
          setPhase('inactive')
          return
        }
        setPrizes(json.prizes)
        setBusinessName(json.businessName || '')

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
          setPhase('auth')
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
  }

  function requireLogin(message?: string) {
    clearToken(slug)
    setSession(null)
    setResult(null)
    setRevealed(false)
    setConfetti(false)
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
    setAuthMessage(null)
    setError(null)
    setPhase('auth')
  }

  async function spin() {
    const token = session?.token
    if (!token) {
      requireLogin('Connectez-vous pour jouer.')
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
    return <p className="py-24 text-center text-sm text-zinc-400">Chargement du jeu…</p>
  }

  if (phase === 'inactive') {
    return (
      <div className="px-6 py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-100 text-3xl">🎡</div>
        <h1 className="mt-5 text-xl font-bold text-zinc-900">Pas de jeu pour le moment</h1>
        <p className="mt-2 text-sm text-zinc-500">Revenez bientôt — la roue de la chance arrive.</p>
        <Link href={`/${slug}`} className="mt-6 inline-block rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white">
          ← Retour au menu
        </Link>
      </div>
    )
  }

  if (phase === 'auth') {
    return (
      <div className="mx-auto max-w-md px-5 pb-16 pt-10">
        <div className="text-center">
          {businessName && (
            <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: accent }}>{businessName}</p>
          )}
          <h1 className="mt-2 text-2xl font-extrabold text-zinc-900">Connectez-vous pour jouer</h1>
          <p className="mt-1 text-sm text-zinc-500">Votre compte garde vos gains et vos points de fidélité.</p>
        </div>
        {authMessage && (
          <p className="mx-auto mt-5 max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
            {authMessage}
          </p>
        )}
        <div className="mt-6">
          <DinerAuth slug={slug} accent={accent} onAuthed={onAuthed} />
        </div>
        <div className="mt-8 text-center">
          <Link href={`/${slug}`} className="text-sm font-semibold text-zinc-500">← Retour au menu</Link>
        </div>
      </div>
    )
  }

  const isWon = phase === 'won' && result && revealed
  const greeting = session?.name || session?.phone || ''

  return (
    <div className="mx-auto max-w-md px-5 pb-16 pt-8">
      {confetti && <Confetti accent={accent} />}

      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: accent }}>{businessName}</p>
        <h1 className="mt-2 text-2xl font-extrabold text-zinc-900">Roue de la chance</h1>
        {greeting && <p className="mt-1 text-sm font-semibold text-zinc-700">Bonjour {greeting} 👋</p>}
        <p className="mt-1 text-sm text-zinc-500">Tournez la roue — tout le monde gagne quelque chose 🎉</p>
      </div>

      <div className="mt-8">
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
            }
          }}
        />
      </div>

      {!isWon && phase !== 'blocked' && (
        <div className="mt-8">
          <button
            type="button"
            onClick={spin}
            disabled={phase === 'spinning'}
            className="btn-shine mx-auto block w-full max-w-xs rounded-2xl py-4 text-base font-extrabold text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: accent, boxShadow: `0 10px 24px -8px ${accent}99` }}
          >
            {phase === 'spinning' ? 'La roue tourne…' : 'Tourner la roue'}
          </button>
          <p className="mt-2 text-center text-[11px] text-zinc-400">Une partie par jour — vos gains et points sont liés à votre compte.</p>
          {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p>}
        </div>
      )}

      {phase === 'blocked' && (
        <div className="mt-8 text-center">
          {error && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">{error}</p>}
          <div className="mt-5 flex justify-center gap-3">
            <Link href={`/${slug}`} className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white">← Retour au menu</Link>
            {loyaltyActive && (
              <Link href={`/${slug}/fidelite`} className="rounded-xl border bg-white px-5 py-2.5 text-sm font-semibold" style={{ borderColor: accent, color: accent }}>
                ★ Mon compte
              </Link>
            )}
          </div>
        </div>
      )}

      {isWon && result && (
        <div className="mt-8 rounded-3xl border-2 bg-white p-6 text-center shadow-sm" style={{ borderColor: accent }}>
          <p className="text-3xl">🎉</p>
          <h2 className="mt-2 text-xl font-extrabold text-zinc-900">Vous avez gagné !</h2>
          <p className="mt-1 text-lg font-bold" style={{ color: accent }}>{result.prizeLabel}</p>

          <button
            type="button"
            onClick={copyCode}
            className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-2xl bg-zinc-50 px-6 py-3 text-2xl font-black tracking-[0.2em] text-zinc-900 ring-1 ring-inset ring-zinc-200 transition hover:bg-zinc-100"
            title="Copier le code"
          >
            {result.code}
            <span className="text-xs font-semibold tracking-normal text-zinc-400">{copied ? 'copié ✓' : 'copier'}</span>
          </button>

          <p className="mt-3 text-xs text-zinc-500">
            Montrez ce code au personnel pour récupérer votre gain.
            <br />
            Valable jusqu’au {new Date(result.expiresAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.
          </p>

          {(result.pointsEarned ?? 0) > 0 && (
            <p className="mt-3 inline-block rounded-full bg-zinc-50 px-4 py-1.5 text-sm font-bold ring-1 ring-inset ring-zinc-200" style={{ color: accent }}>
              ★ +{result.pointsEarned} points{typeof result.balance === 'number' ? ` · solde ${result.balance}` : ''}
            </p>
          )}

          <div className="mt-5 flex justify-center gap-3">
            <Link href={`/${slug}`} className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white">← Retour au menu</Link>
            <Link href={`/${slug}/fidelite`} className="rounded-xl border bg-white px-5 py-2.5 text-sm font-semibold" style={{ borderColor: accent, color: accent }}>
              ★ Mon compte
            </Link>
          </div>
        </div>
      )}

      {/* Logout */}
      {session && (
        <div className="mt-8 text-center">
          <button type="button" onClick={logout} className="text-xs font-medium text-zinc-400 underline-offset-2 hover:underline">
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  )
}
