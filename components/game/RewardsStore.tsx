'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DinerSession } from './DinerAuth'

interface Reward {
  id: string
  label: string
  points_cost: number
}


/**
 * "Boutique" — a clean points store shown from the roulette page. The diner
 * sees their balance and the rewards they can buy with points; affordable ones
 * are redeemable on the spot (→ a code to show staff), the rest show their price
 * with a slim progress bar (no nagging). Self-contained: it fetches
 * /api/loyalty/[slug] and redeems via POST, mirroring AccountSheet.
 */
export default function RewardsStore({
  slug,
  session,
  accent = '#F47B20',
  gradient = 'linear-gradient(135deg, #F47B20, #F5B82E)',
  onClose,
  onRequireLogin,
}: {
  slug: string
  session: DinerSession | null
  accent?: string
  gradient?: string
  onClose: () => void
  onRequireLogin?: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [balance, setBalance] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [redeemed, setRedeemed] = useState<{ code: string; rewardLabel: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const q = session?.phone ? `?phone=${encodeURIComponent(session.phone)}` : ''
      const res = await fetch(`/api/loyalty/${slug}${q}`)
      const cfg = await res.json()
      setRewards(cfg?.active ? cfg.rewards || [] : [])
      setBalance(cfg?.summary?.balance ?? 0)
    } catch {
      setError('Impossible de charger la boutique. Vérifiez votre réseau.')
    } finally {
      setLoading(false)
    }
  }, [slug, session?.phone])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [onClose])

  async function redeem(reward: Reward) {
    if (!session) { onRequireLogin?.(); return }
    setBusyId(reward.id)
    setError(null)
    try {
      const res = await fetch(`/api/loyalty/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: session.phone, rewardId: reward.id }),
      })
      const j = await res.json()
      // QR-session gate (403 rescanRequired) surfaces as a normal error message
      // below — the diner re-scans the café QR, then retries.
      if (!res.ok || !j.success) throw new Error(j.error || 'Échange impossible.')
      setRedeemed({ code: j.code, rewardLabel: j.rewardLabel })
      await load()
    } catch (err: any) {
      setError(err?.message || 'Échange impossible.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Boutique"
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.3)] animate-[storeIn_.26s_cubic-bezier(0.16,0.84,0.3,1)] sm:rounded-3xl"
      >
        {/* Header */}
        <div className="relative shrink-0 px-5 pb-5 pt-4 text-white" style={{ backgroundImage: gradient }}>
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/40 sm:hidden" aria-hidden="true" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">Boutique</p>
          <h2 className="mt-0.5 text-lg font-bold">Échangez vos points</h2>
          <div className="mt-3 inline-flex items-baseline gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
            <span className="text-2xl font-extrabold leading-none tabular-nums">{balance}</span>
            <span className="text-xs font-semibold text-white/85">points</span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-white px-5 pb-8 pt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#ECE7DF]" style={{ borderTopColor: accent }} aria-hidden="true" />
              <p className="mt-4 text-sm text-[#8A8178]">Chargement de la boutique…</p>
            </div>
          ) : (
            <>
              {error && <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p>}

              {redeemed && (
                <div className="mb-4 rounded-2xl border bg-white p-5 text-center" style={{ borderColor: '#ECE7DF' }}>
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}1a`, color: accent }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" /><rect x="2" y="7" width="20" height="5" rx="1" /><path d="M12 21V7" /></svg>
                  </span>
                  <p className="mt-2 font-semibold text-[#1B1714]">{redeemed.rewardLabel}</p>
                  <div className="mx-auto mt-3 w-fit rounded-xl border bg-[#FAFAF9] px-5 py-2.5 font-mono text-xl font-bold tracking-[0.2em] text-[#1B1714]" style={{ borderColor: '#ECE7DF' }}>
                    {redeemed.code}
                  </div>
                  <p className="mt-2 text-xs text-[#8A8178]">Montrez ce code au personnel pour récupérer votre récompense.</p>
                </div>
              )}

              {!session && rewards.length > 0 && (
                <button
                  type="button"
                  onClick={() => onRequireLogin?.()}
                  className="mb-3 w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800"
                >
                  Connectez-vous pour échanger vos points →
                </button>
              )}

              {rewards.length === 0 ? (
                <p className="rounded-2xl border bg-[#FAFAF9] px-4 py-8 text-center text-sm text-[#8A8178]" style={{ borderColor: '#ECE7DF' }}>
                  Aucune récompense pour le moment.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {rewards.map((r) => {
                    const affordable = session != null && balance >= r.points_cost
                    const busy = busyId === r.id
                    const pct = r.points_cost > 0 ? Math.min(100, Math.round((balance / r.points_cost) * 100)) : 100
                    return (
                      <div key={r.id} className="rounded-2xl border bg-white p-4" style={{ borderColor: '#ECE7DF' }}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}14`, color: accent }}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" /><rect x="2" y="7" width="20" height="5" rx="1" /><path d="M12 21V7" /></svg>
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#1B1714]">{r.label}</p>
                              <p className="text-xs font-semibold" style={{ color: accent }}>{r.points_cost} points</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => redeem(r)}
                            disabled={busy || (session != null && !affordable)}
                            className="shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition active:scale-[0.97] disabled:cursor-not-allowed"
                            style={affordable || !session ? { backgroundColor: accent, color: '#fff' } : { backgroundColor: '#F3F1EE', color: '#B8AFA4' }}
                          >
                            {busy ? '…' : affordable || !session ? 'Échanger' : 'Bientôt'}
                          </button>
                        </div>
                        {/* Slim progress toward this reward (only when logged in & not yet affordable) */}
                        {session && !affordable && (
                          <div className="mt-3">
                            <div className="h-1.5 overflow-hidden rounded-full bg-[#F0EDE8]">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: accent }} />
                            </div>
                            <p className="mt-1.5 text-[11px] text-[#8A8178]">Encore {r.points_cost - balance} pts</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes storeIn { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}
