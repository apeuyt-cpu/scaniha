'use client'

import { useState } from 'react'

export interface DinerSession {
  token: string
  phone: string
  name: string | null
}

const phoneValid = (p: string) => p.replace(/[^\d]/g, '').length >= 8

const ORANGE = '#F47B20'
const GRAD = 'linear-gradient(135deg, #FB8B2A, #EF6311)'
const INK = '#1A1410', MUT = '#8C8378', LINE = '#EFEAE3'
const SOFT = '0 1px 2px rgba(0,0,0,0.04), 0 12px 30px -20px rgba(0,0,0,0.3)'

/**
 * Diner login / signup for one business by slug — deliberately minimal: a single
 * clean card (phone + password, name only on signup) with one toggle link, no
 * segmented control. On success it stores the token in
 * localStorage[`scaniha_diner_${slug}`] and calls onAuthed. French throughout.
 */
export default function DinerAuth({
  slug,
  accent = ORANGE,
  gradient = GRAD,
  onAuthed,
}: {
  slug: string
  accent?: string
  gradient?: string
  onAuthed: (session: DinerSession) => void
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The account is a Scaniha feature → pinned brand orange. Props kept for the contract.
  void accent
  void gradient

  const canSubmit = phoneValid(phone) && password.length >= 6 && !busy

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!phoneValid(phone)) { setError('Entrez un numéro de téléphone valide (8 chiffres minimum).'); return }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return }
    setBusy(true)
    try {
      const res = await fetch(`/api/account/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, phone: phone.trim(), password, name: mode === 'signup' && name.trim() ? name.trim() : undefined }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) { setError(json.error || 'Une erreur est survenue. Réessayez.'); return }
      try { localStorage.setItem(`scaniha_diner_${slug}`, json.token) } catch {}
      onAuthed({ token: json.token, phone: json.phone, name: json.name ?? null })
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau.')
    } finally {
      setBusy(false)
    }
  }

  const input = 'w-full rounded-2xl bg-[#FAF8F5] px-4 text-[15px] outline-none transition placeholder:text-[#B7AFA4] focus:bg-white focus:ring-2 disabled:opacity-60'
  const inputStyle = { height: 52, color: INK, border: `1px solid ${LINE}`, ['--tw-ring-color' as any]: `${ORANGE}55` }

  return (
    <div className="mx-auto w-full max-w-sm">
      <form onSubmit={submit} className="rounded-3xl bg-white p-5" style={{ boxShadow: SOFT }}>
        <div className="space-y-2.5">
          {mode === 'signup' && (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom (optionnel)" autoComplete="name" disabled={busy} className={input} style={inputStyle} />
          )}
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numéro de téléphone" inputMode="tel" autoComplete="tel" disabled={busy} className={input} style={inputStyle} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe (6 caractères min.)" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} disabled={busy} className={input} style={inputStyle} />
        </div>

        {error && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-center text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-4 w-full rounded-2xl py-4 text-base font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundImage: GRAD, boxShadow: `0 14px 30px -16px ${ORANGE}` }}
        >
          {busy ? (mode === 'login' ? 'Connexion…' : 'Création…') : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm" style={{ color: MUT }}>
        {mode === 'login' ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }} disabled={busy} className="font-semibold" style={{ color: ORANGE }}>
          {mode === 'login' ? 'Inscrivez-vous' : 'Connectez-vous'}
        </button>
      </p>
    </div>
  )
}
