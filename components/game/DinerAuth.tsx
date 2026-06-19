'use client'

import { useRef, useState } from 'react'

export interface DinerSession {
  token: string
  phone: string
  name: string | null
}

const phoneValid = (p: string) => p.replace(/[^\d]/g, '').length >= 8

const ORANGE = '#F47B20'
const GRAD = 'linear-gradient(135deg, #FB8B2A, #EF6311)'
const INK = '#1A1410', MUT = '#8C8378', FAINT = '#B7AFA4', LINE = '#EFEAE3'
const SOFT = '0 1px 2px rgba(0,0,0,0.04), 0 12px 30px -20px rgba(0,0,0,0.3)'

/** A 4-digit PIN, shown as four cells over one hidden numeric input (one mobile
 *  keyboard, no per-cell focus juggling). Tapping anywhere focuses the input. */
function PinField({ value, onChange, disabled, autoFocus }: { value: string; onChange: (v: string) => void; disabled?: boolean; autoFocus?: boolean }) {
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
        className="absolute inset-0 z-10 h-full w-full cursor-pointer text-transparent opacity-0"
      />
      <div className="flex justify-center gap-3">
        {[0, 1, 2, 3].map((i) => {
          const filled = value.length > i
          const active = value.length === i && !disabled
          return (
            <div
              key={i}
              className="flex h-[58px] w-[52px] items-center justify-center rounded-2xl text-2xl font-bold transition"
              style={{ color: INK, background: '#FAF8F5', border: `2px solid ${active ? ORANGE : filled ? `${ORANGE}66` : LINE}` }}
            >
              {value[i] ?? ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Diner login / signup — deliberately minimal and low-friction: phone + a 4-digit
 * PIN (first name optional on signup), one toggle link, no email, no OTP. Identity
 * is GLOBAL (one account per phone, valid at every café).
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

  function switchMode() { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setPin(''); setForgot(false) }

  const input = 'w-full rounded-2xl bg-[#FAF8F5] px-4 text-[15px] outline-none transition placeholder:text-[#B7AFA4] focus:bg-white focus:ring-2 disabled:opacity-60'
  const inputStyle = { height: 52, color: INK, border: `1px solid ${LINE}`, ['--tw-ring-color' as any]: `${ORANGE}55` }

  return (
    <div className="mx-auto w-full max-w-sm">
      <form onSubmit={submit} className="rounded-3xl bg-white p-5" style={{ boxShadow: SOFT }}>
        <div className="space-y-2.5">
          {mode === 'signup' && (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre prénom (optionnel)" autoComplete="given-name" disabled={busy} className={input} style={inputStyle} />
          )}
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numéro de téléphone" inputMode="tel" autoComplete="tel" disabled={busy} className={input} style={inputStyle} />
        </div>

        <p className="mb-2.5 mt-4 text-center text-xs font-medium" style={{ color: MUT }}>
          {mode === 'signup' ? 'Choisissez un code à 4 chiffres' : 'Entrez votre code à 4 chiffres'}
        </p>
        <PinField value={pin} onChange={setPin} disabled={busy} />

        {mode === 'signup' && welcomePoints > 0 && (
          <p className="mt-4 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-center text-sm font-semibold" style={{ backgroundColor: `${ORANGE}12`, color: '#9a4d10' }}>
            <span aria-hidden="true">🎁</span> {welcomePoints} points offerts à l’inscription
          </p>
        )}

        {error && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-center text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-4 w-full rounded-2xl py-4 text-base font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundImage: GRAD, boxShadow: `0 14px 30px -16px ${ORANGE}` }}
        >
          {busy ? (mode === 'login' ? 'Connexion…' : 'Création…') : mode === 'login' ? 'Se connecter' : 'Commencer à gagner'}
        </button>
      </form>

      {/* Prominent secondary action — a real button, not a tiny link, so the
          "I already have an account" / "create one" path is easy to spot. */}
      <button
        type="button"
        onClick={switchMode}
        disabled={busy}
        className="mt-3 w-full rounded-2xl border-2 bg-white py-3.5 text-base font-bold transition active:scale-[0.99] disabled:opacity-50"
        style={{ borderColor: `${ORANGE}66`, color: '#9a4d10' }}
      >
        {mode === 'login' ? 'Créer un compte' : 'J’ai déjà un compte — Se connecter'}
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

      <p className="mt-4 text-center text-[11px] leading-relaxed" style={{ color: FAINT }}>
        Pas d’e-mail, pas de mot de passe compliqué — juste votre numéro et un code à 4 chiffres.
      </p>
    </div>
  )
}
