'use client'

import { useState } from 'react'

export interface DinerSession {
  token: string
  phone: string
  name: string | null
}

const phoneValid = (p: string) => p.replace(/[^\d]/g, '').length >= 8

/**
 * Diner login / signup card (phone + password) for one business by slug.
 * On success it stores the session token in localStorage[`scaniha_diner_${slug}`]
 * and calls onAuthed. All copy is French; failures show the API's French error
 * inline (including "Les comptes ne sont pas encore configurés." when the
 * accounts SQL hasn't been run yet).
 */
export default function DinerAuth({
  slug,
  accent = '#F47B20',
  gradient = 'linear-gradient(135deg, #F47B20, #F5B82E)',
  onAuthed,
}: {
  slug: string
  accent?: string
  gradient?: string
  onAuthed: (session: DinerSession) => void
}) {
  // Signup is the default — most diners are new, so lead with account creation.
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = phoneValid(phone) && password.length >= 6 && !busy

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!phoneValid(phone)) {
      setError('Entrez un numéro de téléphone valide (8 chiffres minimum).')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/account/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode,
          phone: phone.trim(),
          password,
          name: mode === 'signup' && name.trim() ? name.trim() : undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) {
        setError(json.error || 'Une erreur est survenue. Réessayez.')
        return
      }
      try {
        localStorage.setItem(`scaniha_diner_${slug}`, json.token)
      } catch {}
      onAuthed({ token: json.token, phone: json.phone, name: json.name ?? null })
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau.')
    } finally {
      setBusy(false)
    }
  }

  function switchMode(next: 'login' | 'signup') {
    if (next === mode) return
    setMode(next)
    setError(null)
  }

  // The auth card is a Scaniha feature → pin the brand orange, ignore any
  // business gradient. Props kept for the contract.
  const orange = '#F47B20'
  void accent
  void gradient

  const inputClass =
    'w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-[#1B1714] outline-none transition placeholder:text-[#B8AFA4] focus:ring-2 disabled:opacity-60'
  const inputStyle = { borderColor: '#ECE7DF', ['--tw-ring-color' as any]: `${orange}66` }

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="rounded-3xl border bg-white p-6" style={{ borderColor: '#ECE7DF', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        {/* Segmented control */}
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl p-1" style={{ backgroundColor: '#FAFAF9', boxShadow: 'inset 0 0 0 1px #ECE7DF' }}>
          {(['login', 'signup'] as const).map((m) => {
            const active = mode === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                disabled={busy}
                className="rounded-xl py-2.5 text-sm font-medium transition disabled:cursor-not-allowed"
                style={
                  active
                    ? { backgroundColor: '#fff', color: '#1B1714', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
                    : { color: '#8A8178' }
                }
              >
                {m === 'login' ? 'Connexion' : 'Inscription'}
              </button>
            )
          })}
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#8A8178]">Nom (optionnel)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
                autoComplete="name"
                disabled={busy}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#8A8178]">Numéro de téléphone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+216 …"
              inputMode="tel"
              autoComplete="tel"
              disabled={busy}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#8A8178]">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6 caractères minimum"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              disabled={busy}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-2xl py-3.5 text-base font-medium text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: orange, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            {busy
              ? mode === 'login'
                ? 'Connexion…'
                : 'Création…'
              : mode === 'login'
                ? 'Se connecter'
                : 'Créer mon compte'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-[#8A8178]">
          {mode === 'login' ? (
            <>
              Pas encore de compte ?{' '}
              <button type="button" onClick={() => switchMode('signup')} disabled={busy} className="font-medium" style={{ color: orange }}>
                Inscrivez-vous
              </button>
            </>
          ) : (
            <>
              Déjà un compte ?{' '}
              <button type="button" onClick={() => switchMode('login')} disabled={busy} className="font-medium" style={{ color: orange }}>
                Connectez-vous
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
