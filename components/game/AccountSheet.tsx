'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CustomerSummary } from '@/lib/game'
import type { DinerSession } from './DinerAuth'

interface Reward {
  id: string
  label: string
  points_cost: number
}

interface LoyaltyConfig {
  active: boolean
  businessName: string
  accent: string
  gradient: string
  pointsPerTnd?: number
  rewards: Reward[]
  summary: CustomerSummary | null
}

/** Human labels for the ledger reasons (mirrors LoyaltyClient). */
const REASON_LABELS: Record<string, string> = {
  purchase: 'Achat',
  play: 'Roue de la chance',
  welcome: 'Bienvenue',
  redeem: 'Récompense échangée',
  adjust: 'Ajustement',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const EMPTY_SUMMARY: CustomerSummary = { balance: 0, recent: [], activeWins: [], activeRedemptions: [] }

/**
 * "Mon compte" — bottom sheet (mobile) / centered modal showing the diner's
 * loyalty account for one business: points balance, the codes/bons they can
 * still claim, the rewards they can unlock, and their activity history.
 *
 * Fetches GET /api/loyalty/[slug]?phone=… on open and reuses LoyaltyClient's
 * display/redeem logic. All copy is French. Closes on Escape, backdrop click,
 * or the ✕ button; focus is trapped while open.
 */
export default function AccountSheet({
  slug,
  session,
  accent: accentProp = '#F47B20',
  gradient: gradientProp = 'linear-gradient(135deg, #F47B20, #F5B82E)',
  onClose,
}: {
  slug: string
  session: DinerSession
  accent?: string
  gradient?: string
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState('')
  // Scaniha-branded (the account is a Scaniha feature) — passed in fixed.
  const accent = accentProp
  const gradient = gradientProp
  const [loyaltyActive, setLoyaltyActive] = useState(false)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [summary, setSummary] = useState<CustomerSummary>(EMPTY_SUMMARY)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [redeemed, setRedeemed] = useState<{ code: string; rewardLabel: string } | null>(null)

  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/loyalty/${slug}?phone=${encodeURIComponent(session.phone)}`)
      const cfg: LoyaltyConfig = await res.json()
      setBusinessName(cfg.businessName || '')
      setLoyaltyActive(Boolean(cfg.active))
      setRewards(cfg.active ? cfg.rewards || [] : [])
      setSummary(cfg.summary || EMPTY_SUMMARY)
    } catch {
      setError('Impossible de charger votre compte. Vérifiez votre réseau.')
    } finally {
      setLoading(false)
    }
  }, [slug, session.phone])

  // Fetch on open + lock body scroll while the sheet is up.
  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const id = window.setTimeout(() => closeRef.current?.focus(), 0)
    return () => {
      document.body.style.overflow = prev
      window.clearTimeout(id)
    }
  }, [])

  // Escape to close + trap Tab focus inside the panel.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusables || focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    },
    [onClose]
  )

  async function redeem(reward: Reward) {
    if (!confirm(`Échanger ${reward.points_cost} points contre « ${reward.label} » ?`)) return
    setBusyId(reward.id)
    setError(null)
    try {
      const res = await fetch(`/api/loyalty/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: session.phone, rewardId: reward.id }),
      })
      const j = await res.json()
      if (!res.ok || !j.success) throw new Error(j.error || 'Échange impossible.')
      setRedeemed({ code: j.code, rewardLabel: j.rewardLabel })
      await load() // refresh balance + active codes
    } catch (err: any) {
      setError(err?.message || 'Échange impossible.')
    } finally {
      setBusyId(null)
    }
  }

  const balance = summary.balance ?? 0
  const nextReward = rewards.filter((r) => r.points_cost > balance).sort((a, b) => a.points_cost - b.points_cost)[0]
  const activeCodes = [
    ...summary.activeWins.map((c) => ({ ...c, kind: 'Lot' })),
    ...summary.activeRedemptions.map((c) => ({ ...c, kind: 'Récompense' })),
  ]

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-title"
        onKeyDown={onKeyDown}
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white animate-[sheetIn_.22s_cubic-bezier(0.16,0.84,0.3,1)] sm:rounded-3xl"
        style={{ boxShadow: '0 -8px 30px -12px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.05)' }}
      >
        {/* Clean white header */}
        <div className="relative shrink-0 border-b bg-white px-5 pb-5 pt-4" style={{ borderColor: '#ECE7DF' }}>
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#ECE7DF] sm:hidden" aria-hidden="true" />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-[#8A8178] transition hover:bg-[#FAFAF9]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
          <h2 id="account-title" className="text-base font-medium text-[#1B1714]">Mon compte</h2>
          <p className="mt-0.5 text-sm text-[#8A8178]">
            {session.name || session.phone}
            {session.name && session.phone ? ` · ${session.phone}` : ''}
          </p>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-5xl font-medium leading-none" style={{ color: accent }}>{balance}</p>
            <p className="text-sm font-medium text-[#8A8178]">points</p>
          </div>
          {nextReward && (
            <div className="mt-4 max-w-[16rem]">
              <div className="h-1.5 overflow-hidden rounded-full bg-[#ECE7DF]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.round((balance / nextReward.points_cost) * 100))}%`, backgroundColor: accent }}
                />
              </div>
              <p className="mt-1.5 text-xs text-[#8A8178]">
                Encore {nextReward.points_cost - balance} pts pour « {nextReward.label} »
              </p>
            </div>
          )}
        </div>

        {/* Body (scrolls) */}
        <div className="flex-1 divide-y divide-[#ECE7DF] overflow-y-auto bg-white px-5 pb-8 pt-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span
                className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#ECE7DF]"
                style={{ borderTopColor: accent }}
                aria-hidden="true"
              />
              <p className="mt-4 text-sm text-[#8A8178]">Chargement de votre compte…</p>
            </div>
          ) : (
            <>
              {error && (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p>
              )}

              {redeemed && (
                <div className="mt-4 rounded-2xl border bg-white p-5 text-center" style={{ borderColor: '#ECE7DF' }}>
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}1a`, color: accent }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" /><rect x="2" y="7" width="20" height="5" rx="1" /><path d="M12 21V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
                  </span>
                  <p className="mt-2 font-medium text-[#1B1714]">{redeemed.rewardLabel}</p>
                  <div className="mx-auto mt-3 w-fit rounded-xl border bg-[#FAFAF9] px-5 py-2.5 font-mono text-xl font-medium tracking-[0.2em] text-[#1B1714]" style={{ borderColor: '#ECE7DF' }}>
                    {redeemed.code}
                  </div>
                  <p className="mt-2 text-xs text-[#8A8178]">Montrez ce code au personnel pour récupérer votre récompense.</p>
                </div>
              )}

              {/* Bons à utiliser — active win + redemption codes */}
              <section className="py-6">
                <h3 className="text-xs font-medium uppercase tracking-wide text-[#8A8178]">Mes bons à utiliser</h3>
                {activeCodes.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {activeCodes.map((c) => (
                      <div key={c.code} className="flex items-center justify-between gap-2 rounded-2xl border bg-white px-4 py-3" style={{ borderColor: '#ECE7DF' }}>
                        <div className="min-w-0">
                          <span className="rounded bg-[#FAFAF9] px-2 py-0.5 font-mono text-sm font-medium tracking-wider text-[#1B1714]">{c.code}</span>
                          <span className="ml-2 text-sm text-[#1B1714]">{c.label}</span>
                        </div>
                        <span className="shrink-0 text-[11px] text-[#8A8178]">exp. {fmt(c.expires_at)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-2xl border bg-[#FAFAF9] px-4 py-5 text-center text-sm text-[#8A8178]" style={{ borderColor: '#ECE7DF' }}>
                    Aucun bon pour le moment. Tournez la roue pour gagner !
                  </p>
                )}
              </section>

              {/* Récompenses — redeemable ones are actionable; locked ones are a
                  quiet lock (no grindy "Encore X pts" on every row). */}
              {loyaltyActive && rewards.length > 0 && (
                <section className="py-6">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-[#8A8178]">Récompenses</h3>
                  <div className="mt-3 space-y-2">
                    {rewards.map((r) => {
                      const affordable = balance >= r.points_cost
                      const busy = busyId === r.id
                      return (
                        <div
                          key={r.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border p-4"
                          style={{ borderColor: '#ECE7DF', backgroundColor: affordable ? '#fff' : '#FAFAF9' }}
                        >
                          <div className="min-w-0">
                            <p className={`font-medium ${affordable ? 'text-[#1B1714]' : 'text-[#8A8178]'}`}>{r.label}</p>
                            <p className="text-xs font-medium" style={{ color: affordable ? accent : '#B8AFA4' }}>{r.points_cost} points</p>
                          </div>
                          {affordable ? (
                            <button
                              type="button"
                              onClick={() => redeem(r)}
                              disabled={busy}
                              className="shrink-0 rounded-xl px-4 py-2 text-xs font-semibold text-white transition active:scale-[0.97] disabled:opacity-60"
                              style={{ backgroundColor: accent }}
                            >
                              {busy ? '…' : 'Échanger'}
                            </button>
                          ) : (
                            <span className="shrink-0 text-[#C8C0B5]" title={`Encore ${r.points_cost - balance} pts`} aria-label={`Verrouillé — encore ${r.points_cost - balance} points`}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="5" y="11" width="14" height="9" rx="2" />
                                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                              </svg>
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Historique — points ledger */}
              <section className="py-6">
                <h3 className="text-xs font-medium uppercase tracking-wide text-[#8A8178]">Historique</h3>
                {summary.recent.length > 0 ? (
                  <div className="mt-3 space-y-1.5">
                    {summary.recent.map((t, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 rounded-xl border bg-white px-4 py-2.5 text-sm" style={{ borderColor: '#ECE7DF' }}>
                        <div className="min-w-0">
                          <p className="truncate text-[#1B1714]">
                            {REASON_LABELS[t.reason] || t.reason}
                            {t.note ? ` · ${t.note}` : ''}
                          </p>
                          <p className="text-[11px] text-[#8A8178]">{fmt(t.created_at)}</p>
                        </div>
                        <span className={`shrink-0 font-medium ${t.delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {t.delta >= 0 ? `+${t.delta}` : t.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-2xl border bg-[#FAFAF9] px-4 py-5 text-center text-sm text-[#8A8178]" style={{ borderColor: '#ECE7DF' }}>
                    Aucune activité pour le moment.
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes sheetIn {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
