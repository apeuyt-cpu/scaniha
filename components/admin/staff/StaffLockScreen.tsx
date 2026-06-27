'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ROLE_LABEL: Record<string, string> = { cashier: 'Caissier', server: 'Serveur', manager: 'Manager', owner: 'Propriétaire' }
const PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK']

/**
 * Full-screen lock — shown after the café login when "exiger un PIN" is on.
 * Pick your name → enter your PIN. The account owner always has a bypass tile,
 * so they can never be locked out.
 */
export default function StaffLockScreen({
  businessName, staff, ownerBypass = true,
}: { businessName: string; staff: { id: string; label: string; role: string }[]; ownerBypass?: boolean }) {
  const router = useRouter()
  const [picked, setPicked] = useState<{ id: string; label: string } | null>(null)
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function post(body: any): Promise<boolean> {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/admin/staff/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j?.error || 'Échec.'); setBusy(false); setPin(''); return false }
      router.refresh()
      return true
    } catch { setError('Réseau indisponible.'); setBusy(false); return false }
  }

  function tap(k: string) {
    if (k === '⌫') { setPin((p) => p.slice(0, -1)); return }
    if (k === 'OK') { submit(pin); return }
    // Just append — NO auto-submit (PINs are 4–6 digits; auto-submitting at 4
    // would make a 5/6-digit PIN impossible to enter and self-lock the staff).
    setPin((p) => (p + k).slice(0, 6))
  }

  async function submit(code: string) {
    if (!picked || busy) return
    if (code.length < 4) { setError('Code à 4 à 6 chiffres.'); return }
    await post({ action: 'unlock', staffId: picked.id, pin: code })
  }

  // Physical keyboard (POS terminals often have one): digits / Backspace / Enter.
  useEffect(() => {
    if (!picked) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') tap(e.key)
      else if (e.key === 'Backspace') tap('⌫')
      else if (e.key === 'Enter') submit(pin)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [picked, pin, busy])

  return (
    <div className="admin-shell flex min-h-screen flex-col items-center justify-center px-4 py-10" dir="ltr">
      <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand)] text-lg font-bold text-white shadow-soft">
        {String(businessName || '?').charAt(0).toUpperCase()}
      </div>
      <p className="text-sm font-semibold text-[var(--muted)]">{businessName}</p>

      {!picked ? (
        <div className="mt-6 w-full max-w-md">
          <h1 className="mb-4 text-center text-xl font-bold text-[var(--ink)]">Qui êtes-vous ?</h1>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {staff.map((s) => (
              <button key={s.id} onClick={() => { setPicked({ id: s.id, label: s.label }); setPin(''); setError(null) }}
                className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-soft-lg">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-soft)] text-lg font-bold text-[var(--brand-600)]">{s.label.charAt(0).toUpperCase()}</span>
                <span className="text-sm font-semibold text-[var(--ink)]">{s.label}</span>
                <span className="text-[11px] text-[var(--muted)]">{ROLE_LABEL[s.role] || s.role}</span>
              </button>
            ))}
          </div>
          {ownerBypass && (
            <button onClick={() => post({ action: 'owner' })} disabled={busy}
              className="mt-4 w-full rounded-xl border border-[var(--line)] bg-white py-3 text-sm font-semibold text-[var(--muted)] transition hover:bg-zinc-50 disabled:opacity-50">
              Continuer en tant que propriétaire
            </button>
          )}
          {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="mt-6 w-full max-w-xs">
          <button onClick={() => { setPicked(null); setPin(''); setError(null) }} className="mb-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]">← Changer</button>
          <h1 className="text-center text-xl font-bold text-[var(--ink)]">{picked.label}</h1>
          <p className="mb-4 text-center text-sm text-[var(--muted)]">Entrez votre code PIN</p>
          <div className="mb-5 flex justify-center gap-3">
            {[0, 1, 2, 3, 4, 5].slice(0, Math.max(4, pin.length || 4)).map((i) => (
              <span key={i} className={`h-3.5 w-3.5 rounded-full ${i < pin.length ? 'bg-[var(--brand)]' : 'bg-zinc-200'}`} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {PAD.map((k, i) => {
              const isOk = k === 'OK'
              return (
                <button key={i} onClick={() => tap(k)} disabled={busy || (isOk && pin.length < 4)}
                  className={`flex h-16 items-center justify-center rounded-2xl font-bold transition active:scale-95 disabled:opacity-40 ${
                    isOk ? 'bg-[var(--brand)] text-base text-white shadow-soft hover:bg-[var(--brand-600)]'
                    : 'border border-[var(--line)] bg-white text-2xl text-[var(--ink)] shadow-soft hover:bg-zinc-50'
                  }`}>
                  {k}
                </button>
              )
            })}
          </div>
          {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
          {busy && <p className="mt-4 text-center text-sm text-[var(--muted)]">Vérification…</p>}
        </div>
      )}
    </div>
  )
}
