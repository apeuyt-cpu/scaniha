'use client'

import { useRef, useState } from 'react'
import PhoneInput from '@/components/ui/PhoneInput'

export interface DinerSession {
  token: string
  phone: string
  name: string | null
  age?: number | null
}

const phoneValid = (p: string) => p.replace(/[^\d]/g, '').length >= 8

const ORANGE = '#F47B20'
const GRAD = 'linear-gradient(135deg, #FB8B2A, #EF6311)'
const INK = '#1A1410', MUT = '#71695F', FAINT = '#B7AFA4', LINE = '#EFEAE3'
const SOFT = '0 1px 2px rgba(0,0,0,0.04), 0 12px 30px -20px rgba(0,0,0,0.3)'

/** A 4-digit PIN, shown as four cells over one hidden numeric input (one mobile
 *  keyboard, no per-cell focus juggling). Tapping anywhere focuses the input.
 *  The ACTIVE cell is unmistakable: white fill, orange border + glow ring, a
 *  small lift, and a blinking caret. Filled cells show the digit on a warm tint;
 *  empty cells stay faint. */
function PinField({ value, onChange, disabled, autoFocus, invalid, describedBy }: { value: string; onChange: (v: string) => void; disabled?: boolean; autoFocus?: boolean; invalid?: boolean; describedBy?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="relative mx-auto w-fit" onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={4}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        aria-label="Code à 4 chiffres"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer text-transparent opacity-0"
      />
      <div className="flex justify-center gap-3">
        {[0, 1, 2, 3].map((i) => {
          const filled = value.length > i
          const active = value.length === i && !disabled
          return (
            <div
              key={i}
              className="relative flex h-16 w-14 items-center justify-center rounded-2xl text-[26px] font-bold transition-all duration-150"
              style={{
                color: INK,
                background: active ? '#FFFFFF' : filled ? '#FFF6EE' : '#FAF8F5',
                border: `2px solid ${active ? ORANGE : filled ? `${ORANGE}80` : LINE}`,
                boxShadow: active ? `0 0 0 4px ${ORANGE}22` : 'none',
                transform: active ? 'translateY(-2px)' : 'none',
              }}
            >
              {value[i] ?? (active ? <span className="h-7 w-[2px] animate-pulse motion-reduce:animate-none rounded-full" style={{ background: ORANGE }} /> : '')}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Diner login / signup — deliberately minimal and low-friction: phone + a 4-digit
 * PIN (first name optional on signup), one segmented toggle, no email, no OTP.
 * Identity is GLOBAL (one account per phone, valid at every café).
 *  - With a `slug`: the per-café hub entry — posts to /api/account/[slug] (so that
 *    café's welcome bonus is granted) and stores the token under that café's key.
 *  - Without a `slug`: the café-less WALLET entry — posts to /api/account and
 *    stores the single global token under `scaniha_wallet`.
 * On success it persists the token and calls onAuthed. French throughout.
 */
export default function DinerAuth({
  slug,
  accent = ORANGE,
  gradient = GRAD,
  welcomePoints = 0,
  onAuthed,
}: {
  /** Café slug for the per-café entry; omit for the global wallet entry. */
  slug?: string
  accent?: string
  gradient?: string
  /** Welcome bonus credited on signup — shown as the join hook. */
  welcomePoints?: number
  onAuthed: (session: DinerSession) => void
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forgot, setForgot] = useState(false)

  // The account is a Scaniha feature → pinned brand orange. Props kept for the contract.
  void accent
  void gradient

  const canSubmit = phoneValid(phone) && pin.length === 4 && !busy

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!phoneValid(phone)) { setError('Entrez un numéro de téléphone valide (8 chiffres minimum).'); return }
    if (pin.length !== 4) { setError('Votre code doit contenir 4 chiffres.'); return }
    setBusy(true)
    try {
      const res = await fetch(slug ? `/api/account/${slug}` : '/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, phone: phone.trim(), password: pin, name: mode === 'signup' && name.trim() ? name.trim() : undefined }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) {
        setError(json.error || 'Une erreur est survenue. Réessayez.')
        if (json.suggestLogin) { setMode('login'); setPin('') }
        return
      }
      // Per-café entry stores under the café key; the wallet stores the one global token.
      try { localStorage.setItem(slug ? `scaniha_diner_${slug}` : 'scaniha_wallet', json.token) } catch {}
      onAuthed({ token: json.token, phone: json.phone, name: json.name ?? null })
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau.')
    } finally {
      setBusy(false)
    }
  }

  function selectMode(m: 'login' | 'signup') {
    if (m === mode || busy) return
    setMode(m); setError(null); setPin(''); setForgot(false)
  }

  const input = 'w-full rounded-2xl bg-[#FAF8F5] px-4 text-[15px] outline-none transition placeholder:text-[#776E60] focus:bg-white focus:ring-2 disabled:opacity-60'
  const inputStyle = { height: 52, color: INK, border: `1px solid ${LINE}`, ['--tw-ring-color' as any]: `${ORANGE}55` }

  return (
    <div className="mx-auto w-full max-w-sm">
      {/* Hero */}
      <div className="mb-4 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-white" style={{ backgroundImage: GRAD, boxShadow: `0 12px 26px -12px ${ORANGE}` }} aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="3" /><path d="M2.5 10h19" /><path d="M6.5 15h4" /></svg>
        </div>
        <h2 className="text-xl font-extrabold tracking-tight" style={{ color: INK }}>
          {mode === 'signup' ? 'Votre carte de fidélité' : 'Bon retour 👋'}
        </h2>
        <p className="mx-auto mt-1 max-w-[18rem] text-sm leading-relaxed" style={{ color: MUT }}>
          {mode === 'signup' ? 'Créez-la en 10 secondes — juste votre numéro et un code à 4 chiffres.' : 'Entrez votre numéro et votre code à 4 chiffres.'}
        </p>
      </div>

      {/* Segmented mode toggle */}
      <div className="mb-4 flex gap-1 rounded-2xl p-1" style={{ background: '#F1ECE6' }}>
        {(['signup', 'login'] as const).map((m) => {
          const on = mode === m
          return (
            <button
              key={m}
              type="button"
              onClick={() => selectMode(m)}
              disabled={busy}
              aria-pressed={on}
              className="flex-1 rounded-xl py-2.5 text-sm font-bold transition disabled:opacity-60"
              style={on ? { background: '#fff', color: INK, boxShadow: '0 1px 3px rgba(0,0,0,0.10)' } : { color: MUT }}
            >
              {m === 'signup' ? 'Créer un compte' : 'Se connecter'}
            </button>
          )
        })}
      </div>

      <form onSubmit={submit} className="rounded-3xl bg-white p-5" style={{ boxShadow: SOFT }}>
        <div className="space-y-2.5">
          {mode === 'signup' && (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre prénom (optionnel)" aria-label="Prénom (optionnel)" autoComplete="given-name" disabled={busy} className={input} style={inputStyle} />
          )}
          <PhoneInput id="phone" value={phone} onChange={(val) => setPhone(val)} error={error ? error : undefined} onBlurValidate={() => {}} />
        </div>

        <p className="mb-3 mt-5 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: MUT }}>
          {mode === 'signup' ? 'Choisissez un code à 4 chiffres' : 'Entrez votre code à 4 chiffres'}
        </p>
        <PinField value={pin} onChange={setPin} disabled={busy} invalid={!!error} describedBy={error ? 'auth-error' : undefined} />

        {mode === 'signup' && welcomePoints > 0 && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: `${ORANGE}10`, border: `1.5px dashed ${ORANGE}66` }}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl" style={{ background: `${ORANGE}1f` }} aria-hidden="true">🎁</span>
            <div className="text-left">
              <p className="text-sm font-extrabold" style={{ color: '#9a4d10' }}>{welcomePoints} points offerts</p>
              <p className="text-xs" style={{ color: MUT }}>Crédités dès la création de votre compte.</p>
            </div>
          </div>
        )}

        {error && <p id="auth-error" role="alert" aria-live="assertive" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-center text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-5 w-full rounded-2xl py-4 text-base font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundImage: GRAD, boxShadow: `0 14px 30px -16px ${ORANGE}` }}
        >
          {busy ? (mode === 'login' ? 'Connexion…' : 'Création…') : mode === 'login' ? 'Se connecter' : 'Commencer à gagner'}
        </button>

        {mode === 'login' && (
          <div className="mt-3 text-center">
            <button type="button" onClick={() => setForgot((v) => !v)} disabled={busy} className="text-sm font-semibold underline-offset-2 hover:underline" style={{ color: MUT }}>
              Code oublié&nbsp;?
            </button>
            {forgot && (
              <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left text-xs leading-relaxed text-amber-800">
                Pas de souci — présentez-vous au café avec votre numéro&nbsp;: le personnel réinitialise votre code à 4 chiffres en caisse.
              </p>
            )}
          </div>
        )}
      </form>

      <p className="mx-auto mt-4 max-w-[19rem] text-center text-[11px] leading-relaxed" style={{ color: FAINT }}>
        Pas d’e-mail, pas de mot de passe compliqué — juste votre numéro et un code à 4 chiffres.
      </p>
    </div>
  )
}
