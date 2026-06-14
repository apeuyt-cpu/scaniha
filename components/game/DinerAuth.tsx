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
  onAuthed,
}: {
  slug: string
  accent?: string
  onAuthed: (session: DinerSession) => void
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
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

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        {/* Toggle */}
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-zinc-100 p-1">
          {(['login', 'signup'] as const).map((m) => {
            const active = mode === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                disabled={busy}
                className="rounded-xl py-2 text-sm font-bold transition disabled:cursor-not-allowed"
                style={active ? { backgroundColor: '#fff', color: accent, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : { color: '#71717a' }}
              >
                {m === 'login' ? 'Connexion' : 'Inscription'}
              </button>
            )
          })}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Nom (optionnel)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
                autoComplete="name"
                disabled={busy}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:ring-2 disabled:opacity-60"
                style={{ ['--tw-ring-color' as any]: accent }}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Numéro de téléphone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+216 …"
              inputMode="tel"
              autoComplete="tel"
              disabled={busy}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:ring-2 disabled:opacity-60"
              style={{ ['--tw-ring-color' as any]: accent }}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6 caractères minimum"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              disabled={busy}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:ring-2 disabled:opacity-60"
              style={{ ['--tw-ring-color' as any]: accent }}
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-shine w-full rounded-2xl py-3.5 text-base font-extrabold text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: accent, boxShadow: `0 10px 24px -8px ${accent}99` }}
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

        <p className="mt-4 text-center text-xs text-zinc-400">
          {mode === 'login' ? (
            <>
              Pas encore de compte ?{' '}
              <button type="button" onClick={() => switchMode('signup')} disabled={busy} className="font-semibold" style={{ color: accent }}>
                Inscrivez-vous
              </button>
            </>
          ) : (
            <>
              Déjà un compte ?{' '}
              <button type="button" onClick={() => switchMode('login')} disabled={busy} className="font-semibold" style={{ color: accent }}>
                Connectez-vous
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
