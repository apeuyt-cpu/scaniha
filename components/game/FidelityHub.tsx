'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import RouletteWheel from './RouletteWheel'
import Confetti from './Confetti'
import DinerAuth, { type DinerSession } from './DinerAuth'
import PlayGatesGate from './PlayGatesGate'
import ScanGateNotice from './ScanGateNotice'
import type { GameGate, CustomerSummary } from '@/lib/game'

/**
 * FidelityHub — the customer's loyalty space: ONE place, persistent bottom nav.
 *   Ma carte (account home) · Roue (play) · Boutique (spend) [· Menu when 'both']
 * Account-first; modern, mobile-first surfaces; per-café accent/gradient.
 */

type Phase = 'loading' | 'inactive' | 'auth' | 'ready' | 'spinning' | 'won' | 'blocked'
type Tab = 'carte' | 'roue' | 'boutique'

interface SpinResult { prizeIndex: number; prizeLabel: string; code: string; expiresAt: string; pointsEarned?: number; balance?: number; nextPlayAt?: string | null }
interface Reward { id: string; label: string; points_cost: number }

const EMPTY: CustomerSummary = { balance: 0, recent: [], activeWins: [], activeRedemptions: [] }
const REASON: Record<string, string> = { purchase: 'Achat', play: 'Roue de la chance', welcome: 'Bienvenue', redeem: 'Récompense échangée', adjust: 'Ajustement' }
const fmtDate = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// Modern palette
const BG = '#FAF8F5', INK = '#1A1410', MUT = '#8C8378', FAINT = '#B7AFA4', LINE = '#EFEAE3'
const SOFT = '0 1px 2px rgba(0,0,0,0.04), 0 12px 30px -20px rgba(0,0,0,0.3)'

const KEY = (slug: string) => 'scaniha_diner_' + slug
function deviceId(): string {
  try { let id = localStorage.getItem('scaniha_device'); if (!id) { id = crypto.randomUUID(); localStorage.setItem('scaniha_device', id) } return id } catch { return 'no-storage' }
}
function readToken(slug: string): string | null { try { return localStorage.getItem(KEY(slug)) } catch { return null } }
function clearToken(slug: string) { try { localStorage.removeItem(KEY(slug)) } catch {} }

export default function FidelityHub({
  slug, businessName, accent = '#F47B20', gradient = 'linear-gradient(135deg, #F47B20, #F5B82E)', hasMenu = false,
}: { slug: string; businessName: string; accent?: string; gradient?: string; hasMenu?: boolean }) {
  // The loyalty hub is a Scaniha feature → fixed Scaniha-orange palette (matches
  // the approved redesign + DinerAuth + the game), NOT the café's menu brand
  // (which can be dark/low-contrast). Per-café brand theming is a later phase.
  accent = '#F47B20'
  gradient = 'linear-gradient(135deg, #FB8B2A, #EF6311)'
  const [phase, setPhase] = useState<Phase>('loading')
  const [tab, setTabState] = useState<Tab>('carte')
  const [prizes, setPrizes] = useState<string[]>([])
  // Whether the roulette is on for this café. When OFF but loyalty is ON, the hub
  // runs in "points-only" mode (no Roue tab/CTA). true → identical to before.
  const [hasRoulette, setHasRoulette] = useState(false)
  // Welcome bonus credited at signup — surfaced as the join hook (0 = none).
  const [welcomePoints, setWelcomePoints] = useState(0)
  const [session, setSession] = useState<DinerSession | null>(null)
  const [loyaltyActive, setLoyaltyActive] = useState(false)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [summary, setSummary] = useState<CustomerSummary>(EMPTY)

  const [result, setResult] = useState<SpinResult | null>(null)
  const [confetti, setConfetti] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rescan, setRescan] = useState<string | null>(null)
  const [nextPlayAt, setNextPlayAt] = useState<string | null>(null)
  const [authMessage, setAuthMessage] = useState<string | null>(null)

  const [winModalOpen, setWinModalOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [pendingSpin, setPendingSpin] = useState(false)
  const [gates, setGates] = useState<GameGate[]>([])
  const [gatesCleared, setGatesCleared] = useState(false)
  const [gatesModalOpen, setGatesModalOpen] = useState(false)

  const [redeemed, setRedeemed] = useState<{ code: string; rewardLabel: string } | null>(null)
  const [busyRewardId, setBusyRewardId] = useState<string | null>(null)
  const [boutiqueError, setBoutiqueError] = useState<string | null>(null)
  const [boutiqueRescan, setBoutiqueRescan] = useState<string | null>(null)

  function setTab(next: Tab) { setTabState(next); try { window.history.replaceState(null, '', `?t=${next}`) } catch {} }

  useEffect(() => {
    if (gates.length === 0) return
    try { if (gates.every((g) => localStorage.getItem(`scaniha_gate_${slug}_${g.id}`))) setGatesCleared(true) } catch {}
  }, [gates, slug])

  const loadAccount = useCallback(async (phone: string) => {
    try {
      const r = await fetch(`/api/loyalty/${slug}?phone=${encodeURIComponent(phone)}`)
      const cfg = await r.json()
      setLoyaltyActive(Boolean(cfg.active)); setRewards(cfg.active ? cfg.rewards || [] : []); setSummary(cfg.summary || EMPTY)
    } catch {}
  }, [slug])

  const loadPublicRewards = useCallback(async () => {
    try { const r = await fetch(`/api/loyalty/${slug}`); const cfg = await r.json(); setLoyaltyActive(Boolean(cfg.active)); setRewards(cfg.active ? cfg.rewards || [] : []) } catch {}
  }, [slug])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/game/${slug}`)
        const json = await res.json()
        if (cancelled) return
        const roulette = Boolean(json.active)
        const loyalty = Boolean(json.loyaltyActive)
        // Active if EITHER the roulette OR the points program is on (points-only allowed).
        if (!roulette && !loyalty) { setPhase('inactive'); return }
        setHasRoulette(roulette); setLoyaltyActive(loyalty); setWelcomePoints(Number(json.welcomePoints) || 0)
        setPrizes(Array.isArray(json.prizes) ? json.prizes : []); setGates(Array.isArray(json.gates) ? json.gates : [])

        const token = readToken(slug)
        let authed: DinerSession | null = null
        if (token) {
          try {
            const meRes = await fetch(`/api/account/${slug}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'me', token }) })
            const me = await meRes.json().catch(() => ({}))
            if (meRes.ok && me?.ok) authed = { token, phone: me.phone, name: me.name ?? null }
            else clearToken(slug)
          } catch { clearToken(slug) }
        }
        if (cancelled) return

        let qTab: Tab | null = null
        try { const q = new URLSearchParams(window.location.search).get('t'); if (q === 'carte' || q === 'roue' || q === 'boutique') qTab = q } catch {}
        if (qTab === 'roue' && !roulette) qTab = null
        // Land on "Ma carte" first — value shown before any form (incl. roulette
        // cafés, which now sign the diner up first, then offer the spin).
        setTabState(qTab ?? 'carte')

        if (authed) {
          setSession(authed); loadAccount(authed.phone)
          try {
            const saved = localStorage.getItem(`scaniha_win_${slug}`)
            if (saved) { const w = JSON.parse(saved) as SpinResult; if (new Date(w.expiresAt) > new Date()) { setResult(w); setPhase('won'); return } localStorage.removeItem(`scaniha_win_${slug}`) }
          } catch {}
        } else { loadPublicRewards() }
        setPhase('ready')
      } catch { if (!cancelled) setPhase('inactive') }
    })()
    return () => { cancelled = true }
  }, [slug, loadAccount, loadPublicRewards])

  function onAuthed(s: DinerSession) {
    setSession(s); setAuthMessage(null); setError(null); setPhase('ready'); loadAccount(s.phone)
    if (pendingSpin) { setPendingSpin(false); setTabState('roue'); spin(s.token) }
    // Fresh member at a roulette café → drop them on the wheel for their first spin.
    else if (hasRoulette) setTabState('roue')
  }
  function requireLogin(message?: string) { clearToken(slug); setSession(null); setResult(null); setConfetti(false); setAuthMessage(message ?? null); setPhase('auth') }
  async function logout() {
    const token = session?.token ?? readToken(slug); clearToken(slug)
    try { localStorage.removeItem(`scaniha_win_${slug}`) } catch {}
    if (token) { try { await fetch(`/api/account/${slug}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout', token }) }) } catch {} }
    setSession(null); setSummary(EMPTY); setResult(null); setConfetti(false); setQrOpen(false); setError(null); setRedeemed(null); loadPublicRewards(); setTabState(hasRoulette ? 'roue' : 'carte'); setPhase('ready')
  }

  async function spin(tokenOverride?: string, gatesOk?: boolean) {
    if (!gatesOk && gates.length > 0 && !gatesCleared) { setGatesModalOpen(true); return }
    const token = tokenOverride ?? session?.token
    if (!token) { setPendingSpin(true); requireLogin('Connectez-vous pour tourner la roue — vos gains et points sont gardés sur votre compte.'); return }
    setError(null); setRescan(null); setResult(null); setPhase('spinning')
    try {
      const res = await fetch(`/api/game/${slug}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId: deviceId(), token }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        if (res.status === 401 || json.authRequired) { requireLogin('Votre session a expiré. Reconnectez-vous pour jouer.'); return }
        if (res.status === 403 && json.rescanRequired) { setPhase('ready'); setRescan(typeof json.error === 'string' ? json.error : ''); return }
        if (res.status === 429) setNextPlayAt(typeof json.nextPlayAt === 'string' ? json.nextPlayAt : null)
        setPhase(res.status === 429 ? 'blocked' : 'ready'); setError(json.error || 'Une erreur est survenue. Réessayez.'); return
      }
      const w: SpinResult = json
      setResult(w); setNextPlayAt(typeof json.nextPlayAt === 'string' ? json.nextPlayAt : null)
      try { localStorage.setItem(`scaniha_win_${slug}`, JSON.stringify(w)) } catch {}
    } catch { setPhase('ready'); setError('Connexion impossible. Vérifiez votre réseau.') }
  }

  async function redeem(reward: Reward) {
    if (!session) { requireLogin('Connectez-vous pour échanger vos points contre des récompenses.'); return }
    setBusyRewardId(reward.id); setBoutiqueError(null); setBoutiqueRescan(null)
    try {
      const res = await fetch(`/api/loyalty/${slug}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: session.phone, rewardId: reward.id }) })
      const j = await res.json()
      if (res.status === 403 && j.rescanRequired) { setBoutiqueRescan(typeof j.error === 'string' ? j.error : ''); return }
      if (!res.ok || !j.success) throw new Error(j.error || 'Échange impossible.')
      setRedeemed({ code: j.code, rewardLabel: j.rewardLabel }); await loadAccount(session.phone)
    } catch (e: any) { setBoutiqueError(e?.message || 'Échange impossible.') } finally { setBusyRewardId(null) }
  }

  function copyCode() { if (!result) return; navigator.clipboard?.writeText(result.code); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  // ── Loading / inactive / auth ───────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex min-h-[100svh] flex-col items-center justify-center gap-5 px-6 text-center" style={{ background: BG }}>
        <span className="relative flex h-16 w-16 items-center justify-center" aria-hidden="true">
          <span className="fh-ping absolute inset-0 rounded-full" style={{ backgroundColor: `${accent}1f` }} />
          <svg viewBox="0 0 40 40" width="60" height="60" className="fh-spin"><circle cx="20" cy="20" r="16" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeDasharray="4 6" /><circle cx="20" cy="20" r="3.2" fill={accent} /></svg>
        </span>
        <p className="fh-pulse text-sm font-medium" style={{ color: MUT }}>Chargement…</p>
        <style jsx>{`
          @keyframes fh-spin { to { transform: rotate(360deg) } } @keyframes fh-ping { 0% { transform: scale(0.85); opacity: 0.7 } 100% { transform: scale(1.8); opacity: 0 } } @keyframes fh-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.45 } }
          .fh-spin { transform-origin: 50% 50%; animation: fh-spin 1.1s linear infinite } .fh-ping { animation: fh-ping 1.6s cubic-bezier(0,0,0.2,1) infinite } .fh-pulse { animation: fh-pulse 1.6s ease-in-out infinite }
          @media (prefers-reduced-motion: reduce) { .fh-spin, .fh-ping, .fh-pulse { animation: none !important } .fh-ping { display: none } }
        `}</style>
      </div>
    )
  }

  if (phase === 'inactive') {
    return (
      <div className="px-6 py-24 text-center" style={{ background: BG, minHeight: '100svh' }}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl text-3xl" style={{ background: '#fff', boxShadow: SOFT }}>🎁</div>
        <h1 className="mt-5 text-xl font-semibold" style={{ color: INK }}>Programme bientôt disponible</h1>
        <p className="mt-2 text-sm" style={{ color: MUT }}>Revenez bientôt — la fidélité {businessName ? `chez ${businessName}` : ''} arrive.</p>
        {hasMenu && <Link href={`/${slug}`} className="mt-6 inline-block rounded-2xl px-5 py-2.5 text-sm font-medium" style={{ background: '#fff', color: INK, boxShadow: SOFT }}>← Retour au menu</Link>}
      </div>
    )
  }

  if (phase === 'auth') {
    return (
      <div className="mx-auto flex min-h-[100svh] max-w-md flex-col px-5 pb-10" style={{ background: BG }}>
        <header className="py-4">
          <button type="button" onClick={() => { setPendingSpin(false); setAuthMessage(null); setPhase('ready') }} aria-label="Retour" className="inline-flex h-11 items-center gap-1 rounded-full bg-white pe-3.5 ps-2.5 text-sm font-medium transition active:scale-95" style={{ color: INK, boxShadow: SOFT }}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>Retour
          </button>
        </header>
        <div className="flex flex-1 flex-col justify-center pb-10">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-3xl" style={{ backgroundColor: `${accent}1a` }} aria-hidden="true">🎁</div>
            <h1 className="mt-4 text-2xl font-bold" style={{ color: INK }}>Votre compte fidélité</h1>
            <p className="mx-auto mt-2 max-w-[17rem] text-sm leading-relaxed" style={{ color: MUT }}>{authMessage || (welcomePoints > 0 ? `Créez votre compte en 10 secondes et recevez ${welcomePoints} points offerts.` : 'Créez votre compte en 10 secondes et cumulez des points à chaque visite.')}</p>
          </div>
          <DinerAuth slug={slug} accent={accent} gradient={gradient} welcomePoints={welcomePoints} onAuthed={onAuthed} />
        </div>
      </div>
    )
  }

  // ── Hub ─────────────────────────────────────────────────────────────────────
  const played = phase === 'won' || phase === 'blocked'
  const greeting = session?.name || session?.phone || ''
  const balance = summary.balance ?? 0
  const nextReward = rewards.find((r) => r.points_cost > balance) || null
  const pct = nextReward ? Math.min(100, Math.round((balance / nextReward.points_cost) * 100)) : 100
  const activeCodes = [...summary.activeWins.map((c) => ({ ...c, kind: 'Lot' })), ...summary.activeRedemptions.map((c) => ({ ...c, kind: 'Récompense' }))]
  const cardCode = session ? `SCANIHA:${slug}:${session.phone}` : '' // Phase 6: signed rotating token
  const tabTitle = tab === 'carte' ? 'Ma carte' : tab === 'roue' ? 'Roue de la chance' : 'Boutique'

  return (
    <div className="mx-auto min-h-[100svh] max-w-md pb-28" style={{ background: BG }}>
      {confetti && <Confetti accent={accent} />}

      <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5" style={{ background: 'rgba(250,248,245,0.85)', backdropFilter: 'blur(8px)' }}>
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: FAINT }}>{businessName || 'Fidélité'}</span>
        <span className="shrink-0 text-sm font-semibold" style={{ color: INK }}>{tabTitle}</span>
      </header>

      <div className="px-[18px] pt-1">
        {tab === 'carte' && (
          <CarteTab session={session} accent={accent} gradient={gradient} greeting={greeting} balance={balance} nextReward={nextReward} pct={pct} loyaltyActive={loyaltyActive} rewards={rewards} activeCodes={activeCodes} recent={summary.recent} cardCode={cardCode} qrOpen={qrOpen} setQrOpen={setQrOpen} hasRoulette={hasRoulette} welcomePoints={welcomePoints} onPlay={() => requireLogin()} onLogout={logout} />
        )}
        {hasRoulette && tab === 'roue' && (
          <RoueTab prizes={prizes} accent={accent} gradient={gradient} phase={phase} played={played} result={result} error={error} rescan={rescan} nextPlayAt={nextPlayAt} onSpin={() => spin()} onSpinEnd={() => { if (result) { setConfetti(true); setPhase('won'); setWinModalOpen(true); if (session) loadAccount(session.phone) } }} onReview={() => setWinModalOpen(true)} />
        )}
        {tab === 'boutique' && (
          <BoutiqueTab session={session} accent={accent} gradient={gradient} balance={balance} loyaltyActive={loyaltyActive} rewards={rewards} busyRewardId={busyRewardId} redeemed={redeemed} error={boutiqueError} rescan={boutiqueRescan} onRedeem={redeem} />
        )}
      </div>

      <FidelityNav tab={tab} setTab={setTab} hasMenu={hasMenu} hasRoulette={hasRoulette} slug={slug} accent={accent} />

      {phase === 'won' && result && winModalOpen && (
        <WinModal result={result} accent={accent} gradient={gradient} copied={copied} onCopy={copyCode} onClose={() => setWinModalOpen(false)} onSeeCard={() => { setWinModalOpen(false); setTab('carte') }} />
      )}

      {gatesModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm" onClick={() => setGatesModalOpen(false)}>
          <div className="w-full max-w-[22rem]" onClick={(e) => e.stopPropagation()}>
            <PlayGatesGate gates={gates} slug={slug} deviceId={deviceId()} accent={accent} gradient={gradient} onAllDone={() => { setGatesCleared(true); setGatesModalOpen(false); spin(undefined, true) }} />
            <button type="button" onClick={() => setGatesModalOpen(false)} className="mt-3 block w-full rounded-2xl bg-white/10 py-3 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/20">Plus tard</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Bottom navigation (pill active state) ───────────────────────────────────── */
function FidelityNav({ tab, setTab, hasMenu, hasRoulette, slug, accent }: { tab: Tab; setTab: (t: Tab) => void; hasMenu: boolean; hasRoulette: boolean; slug: string; accent: string }) {
  const pill = (active: boolean) => ({ background: active ? `${accent}1f` : 'transparent', color: active ? accent : FAINT })
  const lbl = (active: boolean) => ({ color: active ? INK : FAINT })
  return (
    <nav aria-label="Navigation fidélité" className="fixed inset-x-0 bottom-0 z-40 bg-white" style={{ borderTop: `1px solid ${LINE}`, paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="mx-auto flex max-w-md px-2.5 pb-3 pt-2">
        {hasMenu && (
          <Link href={`/${slug}`} className="flex flex-1 flex-col items-center gap-1">
            <span className="flex h-[30px] w-11 items-center justify-center rounded-full" style={{ color: FAINT }}><svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg></span>
            <span className="text-[11px] font-medium" style={{ color: FAINT }}>Menu</span>
          </Link>
        )}
        <NavItem active={tab === 'carte'} onClick={() => setTab('carte')} label="Ma carte" pill={pill} lbl={lbl}>
          <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></svg>
        </NavItem>
        {hasRoulette && (
          <NavItem active={tab === 'roue'} onClick={() => setTab('roue')} label="Roue" pill={pill} lbl={lbl}>
            <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" /></svg>
          </NavItem>
        )}
        <NavItem active={tab === 'boutique'} onClick={() => setTab('boutique')} label="Boutique" pill={pill} lbl={lbl}>
          <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
        </NavItem>
      </div>
    </nav>
  )
}
function NavItem({ active, onClick, label, pill, lbl, children }: { active: boolean; onClick: () => void; label: string; pill: (a: boolean) => any; lbl: (a: boolean) => any; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-current={active} className="flex flex-1 flex-col items-center gap-1">
      <span className="flex h-[30px] w-11 items-center justify-center rounded-full transition-colors" style={pill(active)}>{children}</span>
      <span className="text-[11px] font-medium" style={lbl(active)}>{label}</span>
    </button>
  )
}

/* ── Ma carte ────────────────────────────────────────────────────────────────── */
function CarteTab(props: {
  session: DinerSession | null; accent: string; gradient: string; greeting: string; balance: number; nextReward: Reward | null; pct: number; loyaltyActive: boolean
  rewards: Reward[]; activeCodes: Array<{ code: string; label: string; expires_at: string }>; recent: CustomerSummary['recent']; cardCode: string; qrOpen: boolean; setQrOpen: (v: boolean) => void; hasRoulette: boolean; welcomePoints: number; onPlay: () => void; onLogout: () => void
}) {
  const { session, accent, gradient, greeting, balance, nextReward, pct, loyaltyActive, rewards, activeCodes, recent, cardCode, qrOpen, setQrOpen, hasRoulette, welcomePoints, onPlay, onLogout } = props
  if (!session) {
    const perks: Array<{ icon: string; title: string; sub: string }> = []
    if (welcomePoints > 0) perks.push({ icon: '🎁', title: `${welcomePoints} points offerts`, sub: 'rien qu’à l’inscription' })
    if (hasRoulette) perks.push({ icon: '🎰', title: 'Roue de la chance', sub: 'un tour offert — tout le monde gagne' })
    perks.push({ icon: '🎯', title: 'Des récompenses', sub: rewards.length > 0 ? rewards.slice(0, 2).map((r) => r.label).join(', ').toLowerCase() : 'échangez vos points en boutique' })
    return (
      <div className="pt-6">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-3xl" style={{ backgroundColor: `${accent}1a` }} aria-hidden="true">🎁</div>
          <h1 className="mt-4 text-xl font-bold" style={{ color: INK }}>Votre carte de fidélité</h1>
          <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed" style={{ color: MUT }}>Gagnez à chaque visite — c’est gratuit.</p>
        </div>

        <div className="mt-6 space-y-2.5">
          {perks.map((p) => (
            <div key={p.title} className="flex items-center gap-3.5 rounded-[18px] bg-white p-3.5" style={{ boxShadow: SOFT }}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl" style={{ backgroundColor: `${accent}12` }} aria-hidden="true">{p.icon}</span>
              <div className="min-w-0 leading-tight">
                <div className="text-[15px] font-semibold" style={{ color: INK }}>{p.title}</div>
                <div className="truncate text-xs first-letter:uppercase" style={{ color: MUT }}>{p.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={onPlay} className="mt-6 block w-full rounded-2xl py-4 text-base font-semibold text-white transition active:scale-[0.99]" style={{ backgroundImage: gradient, boxShadow: `0 14px 30px -16px ${accent}` }}>Commencer — c’est parti</button>
        <p className="mt-3 text-center text-[11px] leading-relaxed" style={{ color: FAINT }}>Juste votre numéro et un code à 4 chiffres. 10 secondes, sans e-mail.</p>
      </div>
    )
  }
  const initial = (session.name?.trim()?.[0] || session.phone?.replace(/\D/g, '')?.[0] || '•').toUpperCase()
  return (
    <div className="pt-2">
      {/* Greeting */}
      <div className="mb-4 flex items-center gap-3 px-0.5">
        <div className="flex h-11 w-11 items-center justify-center rounded-full text-base font-semibold" style={{ backgroundColor: `${accent}1f`, color: accent }}>{initial}</div>
        <div className="leading-tight"><div className="text-[15px] font-semibold" style={{ color: INK }}>Bonjour, {greeting}</div><div className="text-xs" style={{ color: MUT }}>Membre fidèle</div></div>
      </div>

      {/* Membership card */}
      <div className="relative overflow-hidden rounded-[26px] p-5 text-white" style={{ backgroundImage: gradient, boxShadow: `0 18px 38px -20px ${accent}` }}>
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-12 right-8 h-28 w-28 rounded-full bg-white/[0.07]" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85">Solde fidélité</p>
          <div className="mt-1 flex items-baseline gap-1.5"><span className="text-[44px] font-bold leading-none tabular-nums">{balance}</span><span className="text-sm text-white/90">points</span></div>
          {loyaltyActive && nextReward && (
            <div className="mt-4"><div className="h-[7px] overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }} /></div><p className="mt-2 text-xs text-white/90">Plus que {nextReward.points_cost - balance} pts → {nextReward.label}</p></div>
          )}
          {loyaltyActive && !nextReward && <p className="mt-4 text-xs text-white/90">Vous pouvez échanger vos points en boutique 🎉</p>}
        </div>
      </div>

      {/* QR row */}
      <div className="mt-3.5 rounded-[20px] bg-white p-4" style={{ boxShadow: SOFT }}>
        <button type="button" onClick={() => setQrOpen(!qrOpen)} className="flex w-full items-center gap-3 text-left">
          <span className="flex h-11 w-11 items-center justify-center rounded-[13px]" style={{ background: '#FAF7F3', color: INK }}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M21 14v.01M14 21h.01M21 21v-3M17 21h.01" /></svg>
          </span>
          <span className="flex-1 leading-tight"><span className="block text-sm font-semibold" style={{ color: INK }}>Ma carte à la caisse</span><span className="block text-xs" style={{ color: MUT }}>Présentez pour gagner vos points</span></span>
          <svg viewBox="0 0 24 24" className={`h-5 w-5 transition-transform ${qrOpen ? 'rotate-180' : ''}`} fill="none" stroke={FAINT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        {qrOpen && (
          <div className="mt-4 flex flex-col items-center border-t pt-4" style={{ borderColor: LINE }}>
            <div className="rounded-2xl p-3" style={{ background: '#FAF7F3' }}><QRCodeSVG value={cardCode} size={172} fgColor={INK} bgColor="#FAF7F3" level="M" /></div>
            <p className="mt-3 text-[11px]" style={{ color: MUT }}>{greeting}</p>
          </div>
        )}
      </div>

      {/* Mes bons */}
      <h2 className="mb-2.5 mt-6 px-1 text-xs font-semibold" style={{ color: MUT }}>Mes bons</h2>
      {activeCodes.length > 0 ? (
        <div className="space-y-2.5">
          {activeCodes.map((c) => (
            <div key={c.code} className="flex items-center gap-3 rounded-[18px] bg-white p-3.5" style={{ boxShadow: SOFT, borderLeft: `3px solid ${accent}` }}>
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] shrink-0" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z" /></svg>
              <div className="min-w-0 flex-1"><div className="text-sm font-semibold" style={{ color: INK }}>{c.label}</div><div className="font-mono text-xs" style={{ color: MUT }}>{c.code}</div></div>
              <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ backgroundColor: `${accent}1a`, color: accent }}>À utiliser</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-[18px] bg-white px-4 py-6 text-center text-sm" style={{ color: MUT, boxShadow: SOFT }}>{hasRoulette ? 'Aucun bon pour le moment. Tournez la roue pour gagner !' : 'Aucun bon pour le moment. Cumulez des points à chaque visite !'}</p>
      )}

      {/* Historique */}
      <h2 className="mb-2.5 mt-6 px-1 text-xs font-semibold" style={{ color: MUT }}>Historique</h2>
      {recent.length > 0 ? (
        <div className="rounded-[18px] bg-white px-4" style={{ boxShadow: SOFT }}>
          {recent.map((t, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-3" style={i > 0 ? { borderTop: `1px solid ${LINE}` } : undefined}>
              <div className="min-w-0"><p className="truncate text-sm" style={{ color: INK }}>{REASON[t.reason] || t.reason}{t.note ? ` · ${t.note}` : ''}</p><p className="text-[11px]" style={{ color: FAINT }}>{fmtDate(t.created_at)}</p></div>
              <span className="shrink-0 text-sm font-semibold" style={{ color: t.delta >= 0 ? '#15803d' : '#ef4444' }}>{t.delta >= 0 ? `+${t.delta}` : t.delta}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-[18px] bg-white px-4 py-6 text-center text-sm" style={{ color: MUT, boxShadow: SOFT }}>Aucune activité pour le moment.</p>
      )}

      <div className="pt-6 text-center"><button type="button" onClick={onLogout} className="text-xs font-medium underline-offset-2 hover:underline" style={{ color: FAINT }}>Se déconnecter</button></div>
    </div>
  )
}

/* ── Roue ────────────────────────────────────────────────────────────────────── */
function RoueTab(props: { prizes: string[]; accent: string; gradient: string; phase: Phase; played: boolean; result: SpinResult | null; error: string | null; rescan: string | null; nextPlayAt: string | null; onSpin: () => void; onSpinEnd: () => void; onReview: () => void }) {
  const { prizes, accent, gradient, phase, played, result, error, rescan, nextPlayAt, onSpin, onSpinEnd, onReview } = props
  const blocked = phase === 'blocked'
  return (
    <div className="flex flex-col items-center gap-6 pt-3">
      {!played && <p className="mx-auto max-w-[18rem] text-center text-sm leading-relaxed" style={{ color: MUT }}>Tournez la roue — tout le monde gagne quelque chose.</p>}
      <div className="w-full transition-all" style={blocked ? { opacity: 0.4, filter: 'grayscale(0.25)', pointerEvents: 'none' } : undefined}>
        <RouletteWheel prizes={prizes} accent={accent} spinning={phase === 'spinning' && result !== null} targetIndex={result ? result.prizeIndex : null} onSpinEnd={onSpinEnd} />
      </div>
      <div className="w-full">
        {blocked ? (
          <Cooldown accent={accent} until={nextPlayAt} />
        ) : !played ? (
          <>
            <button type="button" onClick={onSpin} disabled={phase === 'spinning'} className="block w-full rounded-[18px] py-[17px] text-base font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50" style={{ backgroundImage: gradient, boxShadow: `0 14px 30px -14px ${accent}` }}>{phase === 'spinning' ? 'La roue tourne…' : 'Tourner la roue'}</button>
            {rescan !== null ? <ScanGateNotice message={rescan} accent={accent} heading="Scannez le QR du café pour jouer" /> : error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p> : <p className="mt-3.5 text-center text-[11px] leading-relaxed" style={{ color: FAINT }}>Vos gains et vos points sont gardés sur votre compte.</p>}
          </>
        ) : (
          <div className="space-y-2.5">
            <button type="button" onClick={onSpin} className="block w-full rounded-[18px] py-3.5 text-sm font-semibold text-white transition active:scale-[0.99]" style={{ backgroundImage: gradient, boxShadow: `0 14px 30px -14px ${accent}` }}>Rejouer</button>
            {result && <button type="button" onClick={onReview} className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-white py-3.5 text-sm font-semibold transition active:scale-[0.99]" style={{ color: INK, boxShadow: SOFT }}>🎁 Revoir mon gain</button>}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Boutique ────────────────────────────────────────────────────────────────── */
function BoutiqueTab(props: { session: DinerSession | null; accent: string; gradient: string; balance: number; loyaltyActive: boolean; rewards: Reward[]; busyRewardId: string | null; redeemed: { code: string; rewardLabel: string } | null; error: string | null; rescan: string | null; onRedeem: (r: Reward) => void }) {
  const { session, accent, gradient, balance, loyaltyActive, rewards, busyRewardId, redeemed, error, rescan, onRedeem } = props
  if (!loyaltyActive || rewards.length === 0) return <p className="mt-3 rounded-[18px] bg-white px-4 py-10 text-center text-sm" style={{ color: MUT, boxShadow: SOFT }}>Aucune récompense pour le moment.</p>
  return (
    <div className="pt-3">
      {/* Balance header */}
      <div className="relative overflow-hidden rounded-[20px] p-[18px] text-white" style={{ backgroundImage: gradient, boxShadow: `0 14px 30px -18px ${accent}` }}>
        <div className="pointer-events-none absolute -right-7 -top-8 h-28 w-28 rounded-full bg-white/10" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85">Votre solde</p>
            <div className="mt-0.5 flex items-baseline gap-1.5"><span className="text-[34px] font-bold leading-none tabular-nums">{balance}</span><span className="text-sm text-white/90">points</span></div>
          </div>
          <svg viewBox="0 0 24 24" className="h-9 w-9 text-white/85" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" /><rect x="2" y="7" width="20" height="5" rx="1" /><path d="M12 21V7" /></svg>
        </div>
      </div>

      {rescan !== null ? <ScanGateNotice message={rescan} accent={accent} heading="Scannez le QR du café pour échanger" className="mt-3" /> : error ? <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p> : null}

      {redeemed && (
        <div className="mt-3 rounded-[20px] bg-white p-5 text-center" style={{ boxShadow: SOFT }}>
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}1a`, color: accent }} aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></div>
          <p className="mt-2 font-semibold" style={{ color: INK }}>{redeemed.rewardLabel}</p>
          <div className="mx-auto mt-3 w-fit rounded-xl px-5 py-2.5 font-mono text-xl font-bold tracking-[0.2em]" style={{ background: '#FAF8F5', color: INK }}>{redeemed.code}</div>
          <p className="mt-2 text-xs" style={{ color: MUT }}>Montrez ce code au personnel pour récupérer votre récompense.</p>
        </div>
      )}

      {!session && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-800">Connectez-vous pour échanger vos points.</p>}

      <h2 className="mb-2.5 mt-5 px-1 text-xs font-semibold" style={{ color: MUT }}>Récompenses</h2>
      <div className="grid grid-cols-2 gap-3">
        {rewards.map((r) => {
          const affordable = session != null && balance >= r.points_cost
          const busy = busyRewardId === r.id
          const pct = r.points_cost > 0 ? Math.min(100, Math.round((balance / r.points_cost) * 100)) : 100
          return (
            <div key={r.id} className="flex flex-col rounded-[18px] bg-white p-4" style={{ boxShadow: SOFT, border: affordable ? `1.5px solid ${accent}` : '1.5px solid transparent' }}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}14`, color: accent }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" /><rect x="2" y="7" width="20" height="5" rx="1" /><path d="M12 21V7" /></svg></span>
              <p className="mt-2.5 line-clamp-2 min-h-[2.4em] text-[13px] font-semibold leading-snug" style={{ color: INK }}>{r.label}</p>
              <p className="mt-0.5 text-xs font-bold" style={{ color: affordable ? accent : FAINT }}>{r.points_cost} pts</p>
              {affordable || !session ? (
                <button type="button" onClick={() => onRedeem(r)} disabled={busy} className="mt-3 w-full rounded-xl py-2.5 text-xs font-bold text-white transition active:scale-[0.97] disabled:opacity-60" style={{ backgroundColor: accent }}>{busy ? '…' : 'Échanger'}</button>
              ) : (
                <div className="mt-auto pt-3"><div className="h-1.5 overflow-hidden rounded-full" style={{ background: '#F0EBE4' }}><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: accent }} /></div><p className="mt-1.5 text-[10px] font-medium" style={{ color: MUT }}>Encore {r.points_cost - balance} pts</p></div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Cooldown (blocked state) ────────────────────────────────────────────────── */
function Cooldown({ accent, until }: { accent: string; until: string | null }) {
  const [ms, setMs] = useState<number | null>(null)
  useEffect(() => { setMs(msUntilNext(until)); const id = setInterval(() => setMs(msUntilNext(until)), 1000); return () => clearInterval(id) }, [until])
  if (ms === null) return null
  return (
    <div className="w-full rounded-[20px] bg-white p-6 text-center" style={{ boxShadow: SOFT }}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${accent}1a`, color: accent }} aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
      </div>
      <h2 className="mt-3 text-lg font-bold" style={{ color: INK }}>Vous avez déjà joué</h2>
      <p className="mx-auto mt-1 max-w-[16rem] text-sm leading-relaxed" style={{ color: MUT }}>Revenez après le compte à rebours pour retenter votre chance.</p>
      <div className="mt-4 rounded-2xl px-4 py-3.5" style={{ background: '#FAF8F5' }}>
        <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: MUT }}>Prochaine partie dans</p>
        <p className="mt-0.5 text-[32px] font-bold leading-none tabular-nums" style={{ color: accent }}>{fmtCountdown(ms)}</p>
      </div>
    </div>
  )
}

/* ── Win popup ───────────────────────────────────────────────────────────────── */
function WinModal({ result, accent, gradient, copied, onCopy, onClose, onSeeCard }: { result: SpinResult; accent: string; gradient: string; copied: boolean; onCopy: () => void; onClose: () => void; onSeeCard: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <Confetti accent={accent} />
      <div role="dialog" aria-modal="true" aria-label="Vous avez gagné" className="relative w-full max-w-[22rem] overflow-hidden rounded-[26px] bg-white px-6 pb-7 pt-8 text-center animate-[fhwin_.3s_cubic-bezier(0.16,0.84,0.3,1)]" style={{ boxShadow: '0 30px 60px -24px rgba(0,0,0,0.5)' }}>
        <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[#FAF7F3]" style={{ color: MUT }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl" style={{ backgroundColor: `${accent}1a` }}>🎉</div>
        <h2 className="mt-3 text-2xl font-bold" style={{ color: INK }}>Vous avez gagné&nbsp;!</h2>
        <p className="mt-1 text-lg font-semibold" style={{ color: accent }}>{result.prizeLabel}</p>
        <button type="button" onClick={onCopy} className="mx-auto mt-5 flex w-fit items-center gap-2.5 rounded-2xl px-6 py-3 font-mono text-2xl font-bold tracking-[0.2em] transition" style={{ background: '#FAF7F3', color: INK }} title="Copier le code">{result.code}<span className="font-sans text-xs font-medium tracking-normal" style={{ color: MUT }}>{copied ? 'copié ✓' : 'copier'}</span></button>
        <p className="mt-3 text-xs leading-relaxed" style={{ color: MUT }}>Montrez ce code au personnel pour récupérer votre gain.<br />Valable jusqu’au {new Date(result.expiresAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.</p>
        <NextSpinCountdown accent={accent} until={result.nextPlayAt ?? null} />
        <button type="button" onClick={onSeeCard} className="mt-5 block w-full rounded-[18px] py-3.5 text-center text-sm font-semibold text-white transition active:scale-[0.99]" style={{ backgroundImage: gradient, boxShadow: `0 14px 30px -16px ${accent}` }}>Voir ma carte</button>
        <style jsx global>{`@keyframes fhwin { from { opacity: 0; transform: translateY(28px) scale(0.96) } to { opacity: 1; transform: translateY(0) scale(1) } }`}</style>
      </div>
    </div>
  )
}

/* ── Countdown ───────────────────────────────────────────────────────────────── */
function msUntilTunisReset(): number { const now = new Date(); const tunisNow = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Tunis' })); const mid = new Date(tunisNow); mid.setHours(24, 0, 0, 0); return Math.max(0, mid.getTime() - tunisNow.getTime()) }
function msUntilNext(until?: string | null): number { if (until) { const t = new Date(until).getTime(); if (Number.isFinite(t)) return Math.max(0, t - Date.now()) } return msUntilTunisReset() }
function fmtCountdown(ms: number): string { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60; if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`; if (m > 0) return `${m}m ${sec.toString().padStart(2, '0')}s`; return `${sec}s` }
function NextSpinCountdown({ accent, until = null }: { accent: string; until?: string | null }) {
  const [ms, setMs] = useState<number | null>(null)
  useEffect(() => { setMs(msUntilNext(until)); const id = setInterval(() => setMs(msUntilNext(until)), 1000); return () => clearInterval(id) }, [until])
  if (ms === null) return null
  return (
    <div className="mt-5 rounded-[18px] bg-white px-4 py-4 text-center" style={{ boxShadow: SOFT }}>
      <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: MUT }}>Prochaine partie dans</p>
      <p className="mt-1 text-3xl font-medium tabular-nums" style={{ color: accent }}>{fmtCountdown(ms)}</p>
      <p className="mt-1 text-[11px]" style={{ color: MUT }}>Revenez bientôt pour rejouer&nbsp;!</p>
    </div>
  )
}
