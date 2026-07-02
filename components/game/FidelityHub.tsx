'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Confetti from './Confetti'

// Client-only, tab-gated widgets — keep them out of the initial loyalty-page chunk.
// The QR renders only on the 'carte' tab; the wheel only on the 'roue' tab. Named
// to match the original imports so every <QRCodeSVG …/> / <RouletteWheel …/> call-site is unchanged.
const RouletteWheel = dynamic(() => import('./RouletteWheel'), {
  ssr: false,
  loading: () => <div className="aspect-square w-full" aria-hidden="true" />,
})
const SlotMachine777 = dynamic(() => import('./SlotMachine777'), { ssr: false, loading: () => <div className="aspect-square w-full" aria-hidden="true" /> })
const QRCodeSVG = dynamic(() => import('qrcode.react').then((m) => m.QRCodeSVG), { ssr: false })
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
interface Reward { id: string; label: string; points_cost: number; image_url?: string | null }

const EMPTY: CustomerSummary = { balance: 0, recent: [], activeWins: [], activeRedemptions: [] }
const REASON: Record<string, string> = { purchase: 'Achat', play: 'Roue de la chance', welcome: 'Bienvenue', redeem: 'Récompense échangée', adjust: 'Ajustement' }
const fmtDate = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// Modern palette
// MUT/FAINT_TEXT are darkened from the original #8C8378/#B7AFA4 so information-bearing
// text meets WCAG 2.1 AA (4.5:1) on the cream/white surfaces; FAINT (#B7AFA4) is kept
// ONLY for the decorative chevron stroke. Same warm hue, deeper gray — no layout change.
const BG = '#FAF8F5', INK = '#1A1410', MUT = '#71695F', FAINT = '#B7AFA4', FAINT_TEXT = '#6E665C', LINE = '#EFEAE3'
const SOFT = '0 1px 2px rgba(0,0,0,0.04), 0 12px 30px -20px rgba(0,0,0,0.3)'

const KEY = (slug: string) => 'scaniha_diner_' + slug
function deviceId(): string {
  try { let id = localStorage.getItem('scaniha_device'); if (!id) { id = crypto.randomUUID(); localStorage.setItem('scaniha_device', id) } return id } catch { return 'no-storage' }
}
function readToken(slug: string): string | null { try { return localStorage.getItem(KEY(slug)) } catch { return null } }
function clearToken(slug: string) { try { localStorage.removeItem(KEY(slug)) } catch {} }

export default function FidelityHub({
  slug, businessName, logoUrl = null, accent = '#F47B20', gradient = 'linear-gradient(135deg, #F47B20, #F5B82E)', hasMenu = false, defaultTab = 'carte',
}: { slug: string; businessName: string; logoUrl?: string | null; accent?: string; gradient?: string; hasMenu?: boolean; defaultTab?: Tab }) {
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
  const [gameMode, setGameMode] = useState('roulette')
  const [prizeIcons, setPrizeIcons] = useState<(string | null)[]>([])

  const [prizeIsLose, setPrizeIsLose] = useState<boolean[]>([])
  const [slotEnabled, setSlotEnabled] = useState(false)
  const [slotPointCost, setSlotPointCost] = useState(10)
  const [rouletteEnabled, setRouletteEnabled] = useState(true)
  const [rouletteSchedule, setRouletteSchedule] = useState<any>(null)

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

  const loadAccount = useCallback(async (phone: string, tokenOverride?: string) => {
    try {
      // The session token authorizes returning the private summary for this phone.
      const t = tokenOverride ?? readToken(slug)
      const q = t ? `&token=${encodeURIComponent(t)}` : ''
      const r = await fetch(`/api/loyalty/${slug}?phone=${encodeURIComponent(phone)}${q}`)
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
        const loadedPrizes = Array.isArray(json.prizes) ? json.prizes : []; setPrizes(loadedPrizes); setPrizeIcons(loadedPrizes.map((p: any) => p.config?.icon || null)); setGameMode(json.config?.mode || 'roulette'); setGates(Array.isArray(json.gates) ? json.gates : [])

        setPrizeIsLose(json.prizeIsLose || [])
        setSlotEnabled(Boolean(json.slotEnabled))
        setSlotPointCost(Number(json.slotPointCost) || 10)
        setRouletteEnabled(json.rouletteEnabled !== false)
        setRouletteSchedule(json.rouletteSchedule || null)


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
        // Default landing is owner-configured (defaultTab) — e.g. land on the
        // boutique instead of the roulette. Falls back to 'carte' if the chosen
        // page is the roue but the roulette is off. An explicit ?t= still wins.
        const landing: Tab = defaultTab === 'roue' && !roulette ? 'carte' : defaultTab
        setTabState(qTab ?? landing)

        if (authed) {
          setSession(authed); loadAccount(authed.phone, authed.token)
          try {
            const saved = localStorage.getItem(`scaniha_win_${slug}`)
            if (saved) { const w = JSON.parse(saved) as SpinResult; if (new Date(w.expiresAt) > new Date()) { setResult(w); setPhase('won'); return } localStorage.removeItem(`scaniha_win_${slug}`) }
          } catch {}
        } else { loadPublicRewards() }
        setPhase('ready')
      } catch { if (!cancelled) setPhase('inactive') }
    })()
    return () => { cancelled = true }
  }, [slug, loadAccount, loadPublicRewards, defaultTab])

  function onAuthed(s: DinerSession) {
    setSession(s); setAuthMessage(null); setError(null); setPhase('ready'); loadAccount(s.phone, s.token)
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
      const res = await fetch(`/api/loyalty/${slug}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: session.phone, token: session.token, rewardId: reward.id }) })
      const j = await res.json()
      if (res.status === 403 && j.rescanRequired) { setBoutiqueRescan(typeof j.error === 'string' ? j.error : ''); return }
      if (!res.ok || !j.success) throw new Error(j.error || 'Échange impossible.')
      setRedeemed({ code: j.code, rewardLabel: j.rewardLabel }); await loadAccount(session.phone, session.token)
    } catch (e: any) { setBoutiqueError(e?.message || 'Échange impossible.') } finally { setBusyRewardId(null) }
  }

  function copyCode() { if (!result) return; navigator.clipboard?.writeText(result.code); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  // ── Loading / inactive / auth ───────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="mx-auto min-h-[100svh] max-w-md pb-28" style={{ background: BG }} aria-busy="true" aria-label="Chargement de votre fidélité">
        {/* Skeleton mirrors the "Ma carte" layout so the swap to real content is seamless. */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5" style={{ background: 'rgba(250,248,245,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="fh-sk h-3 w-24 rounded-full" />
          <div className="fh-sk h-3.5 w-16 rounded-full" />
        </div>

        <div className="px-[18px] pt-2">
          {/* Greeting */}
          <div className="mb-4 flex items-center gap-3 px-0.5">
            <div className="fh-sk h-11 w-11 rounded-full" />
            <div className="space-y-2">
              <div className="fh-sk h-3.5 w-32 rounded-full" />
              <div className="fh-sk h-2.5 w-20 rounded-full" />
            </div>
          </div>

          {/* Membership card */}
          <div className="fh-sk h-[148px] w-full rounded-[26px]" />

          {/* QR row */}
          <div className="mt-3.5 flex items-center gap-3 rounded-[20px] bg-white p-4" style={{ boxShadow: SOFT }}>
            <div className="fh-sk h-11 w-11 rounded-[13px]" />
            <div className="flex-1 space-y-2">
              <div className="fh-sk h-3.5 w-40 rounded-full" />
              <div className="fh-sk h-2.5 w-28 rounded-full" />
            </div>
          </div>

          {/* Mes bons */}
          <div className="fh-sk mb-2.5 mt-6 h-2.5 w-16 rounded-full" />
          <div className="space-y-2.5">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-[18px] bg-white p-3.5" style={{ boxShadow: SOFT }}>
                <div className="fh-sk h-[22px] w-[22px] rounded-md" />
                <div className="flex-1 space-y-2">
                  <div className="fh-sk h-3.5 w-3/4 rounded-full" />
                  <div className="fh-sk h-2.5 w-1/3 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom nav placeholder */}
        <nav aria-hidden="true" className="fixed inset-x-0 bottom-0 z-40 bg-white" style={{ borderTop: `1px solid ${LINE}`, paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="mx-auto flex max-w-md px-2.5 pb-3 pt-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5 py-1">
                <div className="fh-sk h-[26px] w-10 rounded-full" />
                <div className="fh-sk h-2 w-10 rounded-full" />
              </div>
            ))}
          </div>
        </nav>

        <style jsx>{`
          .fh-sk { position: relative; overflow: hidden; background: #ECE7E0; }
          .fh-sk::after { content: ''; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.65), transparent); animation: fh-shimmer 1.4s ease-in-out infinite; }
          @keyframes fh-shimmer { 100% { transform: translateX(100%) } }
          @media (prefers-reduced-motion: reduce) { .fh-sk::after { animation: none } }
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
  const tabTitle = tab === 'carte' ? 'Ma carte' : tab === 'roue' ? '🎰 Games' : 'Boutique'

  return (
    <div className="mx-auto min-h-[100svh] max-w-md pb-28" style={{ background: BG }}>
      {confetti && <Confetti accent={accent} />}

      <header className="sticky top-0 z-10 flex items-center gap-2.5 px-5 py-3" style={{ background: 'rgba(250,248,245,0.85)', backdropFilter: 'blur(8px)' }}>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={businessName} className="h-9 w-9 shrink-0 rounded-xl bg-white object-contain ring-1 ring-black/5" />
        )}
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-tight" style={{ color: INK }}>{businessName || 'Fidélité'}</span>
        <span className="shrink-0 text-xs font-semibold" style={{ color: MUT }}>{tabTitle}</span>
      </header>

      <div className="px-[18px] pt-1">
        {tab === 'carte' && (
          <CarteTab session={session} businessName={businessName} accent={accent} gradient={gradient} greeting={greeting} balance={balance} nextReward={nextReward} pct={pct} loyaltyActive={loyaltyActive} rewards={rewards} activeCodes={activeCodes} recent={summary.recent} cardCode={cardCode} qrOpen={qrOpen} setQrOpen={setQrOpen} hasRoulette={hasRoulette} welcomePoints={welcomePoints} onPlay={() => requireLogin()} onLogout={logout} />
        )}
        {hasRoulette && tab === 'roue' && (
          <RoueTab prizes={prizes} prizeIcons={prizeIcons} prizeIsLose={prizeIsLose} slotEnabled={slotEnabled} slotPointCost={slotPointCost} rouletteEnabled={rouletteEnabled} rouletteSchedule={rouletteSchedule} gameMode={gameMode} accent={accent} gradient={gradient} phase={phase} played={played} result={result} error={error} rescan={rescan} nextPlayAt={nextPlayAt} balance={balance} onSpin={() => spin()} onSpinEnd={() => { if (result) { setConfetti(true); setPhase('won'); setWinModalOpen(true); if (session) loadAccount(session.phone, session.token) } }} onReview={() => setWinModalOpen(true)} />
        )}
        {tab === 'boutique' && (
          <BoutiqueTab session={session} businessName={businessName} accent={accent} gradient={gradient} balance={balance} loyaltyActive={loyaltyActive} rewards={rewards} busyRewardId={busyRewardId} redeemed={redeemed} error={boutiqueError} rescan={boutiqueRescan} onRedeem={redeem} />
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
  const pill = (active: boolean) => ({ background: active ? `${accent}1f` : 'transparent', color: active ? accent : FAINT_TEXT })
  const lbl = (active: boolean) => ({ color: active ? INK : FAINT_TEXT })
  return (
    <nav aria-label="Navigation fidélité" className="fixed inset-x-0 bottom-0 z-40 bg-white" style={{ borderTop: `1px solid ${LINE}`, paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="mx-auto flex max-w-md px-2.5 pb-3 pt-2">
        {hasMenu && (
          <Link href={`/${slug}`} className="flex flex-1 flex-col items-center gap-1">
            <span className="flex h-[30px] w-11 items-center justify-center rounded-full" style={{ color: FAINT_TEXT }}><svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg></span>
            <span className="text-[11px] font-medium" style={{ color: FAINT_TEXT }}>Menu</span>
          </Link>
        )}
        <NavItem active={tab === 'carte'} onClick={() => setTab('carte')} label="Ma carte" pill={pill} lbl={lbl}>
          <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></svg>
        </NavItem>
        {hasRoulette && (
          <NavItem active={tab === 'roue'} onClick={() => setTab('roue')} label="Games" pill={pill} lbl={lbl}>
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
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className="flex flex-1 flex-col items-center gap-1">
      <span className="flex h-[30px] w-11 items-center justify-center rounded-full transition-colors" style={pill(active)}>{children}</span>
      <span className="text-[11px] font-medium" style={lbl(active)}>{label}</span>
    </button>
  )
}

/* ── Ma carte ────────────────────────────────────────────────────────────────── */
function CarteTab(props: {
  session: DinerSession | null; businessName: string; accent: string; gradient: string; greeting: string; balance: number; nextReward: Reward | null; pct: number; loyaltyActive: boolean
  rewards: Reward[]; activeCodes: Array<{ code: string; label: string; expires_at: string }>; recent: CustomerSummary['recent']; cardCode: string; qrOpen: boolean; setQrOpen: (v: boolean) => void; hasRoulette: boolean; welcomePoints: number; onPlay: () => void; onLogout: () => void
}) {
  const { session, businessName, accent, gradient, greeting, balance, nextReward, pct, loyaltyActive, rewards, activeCodes, recent, cardCode, qrOpen, setQrOpen, hasRoulette, welcomePoints, onPlay, onLogout } = props
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
        <p className="mt-3 text-center text-[11px] leading-relaxed" style={{ color: FAINT_TEXT }}>Juste votre numéro et un code à 4 chiffres. 10 secondes, sans e-mail.</p>
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
          {businessName && <p className="truncate text-sm font-bold tracking-wide text-white">{businessName}</p>}
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85">Solde fidélité</p>
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
            <div className="rounded-2xl p-3" style={{ background: '#FAF7F3' }}><QRCodeSVG value={cardCode} size={172} fgColor={INK} bgColor="#FAF7F3" level="M" role="img" aria-label="Code QR de votre carte de fidélité — à présenter à la caisse" /></div>
            <p className="mt-3 text-[11px]" style={{ color: MUT }}>{greeting}</p>
          </div>
        )}
      </div>

      {/* Mes bons */}
      <div className="mb-2.5 mt-7 flex items-center justify-between px-1">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: FAINT_TEXT }}>Mes bons</h2>
        {activeCodes.length > 0 && <span className="rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums" style={{ backgroundColor: `${accent}14`, color: accent }}>{activeCodes.length}</span>}
      </div>
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
        <p className="rounded-[18px] bg-white px-4 py-6 text-center text-sm" style={{ color: MUT, boxShadow: SOFT }}>{hasRoulette ? 'Aucun bon pour le moment. Jouez pour gagner !' : 'Aucun bon pour le moment. Cumulez des points à chaque visite !'}</p>
      )}

      {/* Historique */}
      <h2 className="mb-2.5 mt-7 px-1 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: FAINT_TEXT }}>Historique</h2>
      {recent.length > 0 ? (
        <div className="rounded-[18px] bg-white px-4" style={{ boxShadow: SOFT }}>
          {recent.map((t, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-3" style={i > 0 ? { borderTop: `1px solid ${LINE}` } : undefined}>
              <div className="min-w-0"><p className="truncate text-sm" style={{ color: INK }}>{REASON[t.reason] || t.reason}{t.note ? ` · ${t.note}` : ''}</p><p className="text-[11px]" style={{ color: FAINT_TEXT }}>{fmtDate(t.created_at)}</p></div>
              <span className="shrink-0 text-sm font-semibold" style={{ color: t.delta >= 0 ? '#15803d' : '#ef4444' }}>{t.delta >= 0 ? `+${t.delta}` : t.delta}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-[18px] bg-white px-4 py-6 text-center text-sm" style={{ color: MUT, boxShadow: SOFT }}>Aucune activité pour le moment.</p>
      )}

      <div className="pt-6 text-center"><button type="button" onClick={onLogout} className="text-xs font-medium underline-offset-2 hover:underline" style={{ color: FAINT_TEXT }}>Se déconnecter</button></div>
    </div>
  )
}

/* ── Games Arcade Tab ─────────────────────────────────────────────────────── */

function RoueTab(props: { prizes: string[]; prizeIcons: (string | null)[]; prizeIsLose?: boolean[]; slotEnabled?: boolean; slotPointCost?: number; rouletteEnabled?: boolean; rouletteSchedule?: any; gameMode: string; accent: string; gradient: string; phase: Phase; played: boolean; result: SpinResult | null; error: string | null; rescan: string | null; nextPlayAt: string | null; balance: number; onSpin: () => void; onSpinEnd: () => void; onReview: () => void }) {
  const { prizes, prizeIcons, prizeIsLose, slotEnabled, slotPointCost = 10, rouletteEnabled = true, rouletteSchedule, accent, gradient, phase, played, result, error, rescan, nextPlayAt, balance, onSpin, onSpinEnd, onReview } = props
  const [selectedGame, setSelectedGame] = useState<'roulette' | 'slot777' | null>(null)
  const blocked = phase === 'blocked'
  const spinning = phase === 'spinning' && result !== null

  // Check schedule
  const now = new Date()
  const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
  let rAvailable = rouletteEnabled
  if (rAvailable && rouletteSchedule?.enabled) {
    if (rouletteSchedule.startTime && timeStr < rouletteSchedule.startTime) rAvailable = false
    if (rouletteSchedule.endTime && timeStr > rouletteSchedule.endTime) rAvailable = false
  }

  const isSlot = selectedGame === 'slot777'
  const GAME_COST = isSlot ? slotPointCost : 10
  const canPlay = balance >= GAME_COST || played

  if (!selectedGame) {
    return (
      <div className="pt-4">
        <style jsx>{`
          @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
          @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
          .game-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
          .game-card:hover { transform: translateY(-4px); }
          .game-card:active { transform: scale(0.97); }
          .float-anim { animation: float 3s ease-in-out infinite; }
          .shimmer-text {
            background: linear-gradient(90deg, #FFD700 0%, #FFF8DC 40%, #FFD700 60%, #B8860B 100%);
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shimmer 3s linear infinite;
          }
        `}</style>

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="shimmer-text" style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Georgia, serif', letterSpacing: '0.05em' }}>
            🎰 Casino Games
          </div>
          <p style={{ color: '#71695F', fontSize: 13, marginTop: 4 }}>Utilisez vos points pour jouer</p>
          {/* Points balance badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
            background: 'linear-gradient(135deg, #1a6b1a, #2d9e2d)',
            borderRadius: 20, padding: '6px 16px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}>
            <span style={{ fontSize: 16 }}>🪙</span>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{balance} pts</span>
          </div>
        </div>

        {/* Game Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Roulette Card */}
          {rAvailable ? (
            <button
              type="button"
              disabled={balance < 10 && !played}
              onClick={() => setSelectedGame('roulette')}
              className="game-card"
              style={{
                background: 'linear-gradient(145deg, #1a0002, #3d0000)',
                border: '2px solid #B8860B',
                borderRadius: 20,
                padding: '20px 18px',
                textAlign: 'left',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,215,0,0.15)',
                opacity: (balance < 10 && !played) ? 0.6 : 1,
                cursor: (balance < 10 && !played) ? 'not-allowed' : 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,215,0,0.12) 0%, transparent 70%)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="float-anim" style={{ fontSize: 50, lineHeight: 1, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>🎡</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#FFD700', fontWeight: 900, fontSize: 20, fontFamily: 'Georgia, serif', textShadow: '0 0 15px rgba(255,215,0,0.5)' }}>Roulette Casino</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 }}>Tournez la roue — tout le monde gagne !</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <span style={{ background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.4)', color: '#FFD700', borderRadius: 8, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>🪙 10 pts</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Classique</span>
                  </div>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,215,0,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </button>
          ) : (
            <div style={{ background: 'rgba(0,0,0,0.05)', borderRadius: 20, padding: '20px 18px', textAlign: 'center' }}>
              <span style={{ fontSize: 24, filter: 'grayscale(1)', opacity: 0.5 }}>🎡</span>
              <div style={{ color: '#71695F', fontWeight: 600, fontSize: 14, marginTop: 8 }}>La roulette n'est pas disponible actuellement</div>
            </div>
          )}

          {/* Slot 777 Card */}
          {slotEnabled && (
            <button
              type="button"
              disabled={balance < slotPointCost && !played}
              onClick={() => setSelectedGame('slot777')}
              className="game-card"
              style={{
                background: 'linear-gradient(145deg, #000d2e, #001a5c)',
                border: '2px solid #7B68EE',
                borderRadius: 20,
                padding: '20px 18px',
                textAlign: 'left',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(123,104,238,0.2)',
                opacity: (balance < slotPointCost && !played) ? 0.6 : 1,
                cursor: (balance < slotPointCost && !played) ? 'not-allowed' : 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(123,104,238,0.15) 0%, transparent 70%)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="float-anim" style={{ fontSize: 50, lineHeight: 1, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))', animationDelay: '0.5s' }}>🎰</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#A78BFA', fontWeight: 900, fontSize: 20, fontFamily: 'Georgia, serif', textShadow: '0 0 15px rgba(167,139,250,0.5)' }}>Slot Machine 777</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 }}>3 rouleaux — alignez vos symboles !</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <span style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.4)', color: '#A78BFA', borderRadius: 8, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>🪙 {slotPointCost} pts</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Jackpot !</span>
                  </div>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </button>
          )}

        </div>

        {blocked && <Cooldown accent={accent} until={nextPlayAt} />}
        {!blocked && error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p>}
        {!blocked && rescan !== null && <ScanGateNotice message={rescan} accent={accent} heading="Scannez le QR du café pour jouer" />}
      </div>
    )
  }

  // ── Game is selected, show it ──────────────────────────────────────────────
  const gameColor = isSlot ? '#A78BFA' : '#FFD700'
  const gameBg = isSlot ? 'linear-gradient(145deg, #000d2e, #001a5c)' : 'linear-gradient(145deg, #1a0002, #3d0000)'
  const gameName = isSlot ? 'Slot Machine 777' : 'Roulette Casino'

  return (
    <div className="pt-3 flex flex-col gap-4">
      {/* Back + Game Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={() => { if (phase !== 'spinning') setSelectedGame(null) }}
          style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', color: '#1A1410', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Jeux
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: gameColor, fontFamily: 'Georgia, serif', textShadow: `0 0 10px ${gameColor}44` }}>{gameName}</span>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.06)', borderRadius: 10, padding: '4px 10px', fontSize: 13, fontWeight: 700, color: '#1A1410' }}>
          🪙 {balance}
        </div>
      </div>

      {/* Game Machine */}
      <div style={{ borderRadius: 20, overflow: 'hidden', background: gameBg, border: `2px solid ${gameColor}55`, boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px ${gameColor}22` }}>
        <div style={{ padding: '16px 12px' }}>
          {isSlot ? (
            <SlotMachine777
              prizes={prizes}
              prizeIcons={prizeIcons}
              prizeIsLose={prizeIsLose}
              spinning={spinning}
              targetIndex={result ? result.prizeIndex : null}
              onSpinEnd={onSpinEnd}
            />
          ) : (
            <RouletteWheel
              prizes={prizes}
              prizeIcons={prizeIcons}
              spinning={spinning}
              targetIndex={result ? result.prizeIndex : null}
              onSpinEnd={onSpinEnd}
              accent={accent}
            />
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="w-full">
        {blocked ? (
          <Cooldown accent={accent} until={nextPlayAt} />
        ) : !played ? (
          <>
            <button
              type="button"
              onClick={onSpin}
              disabled={phase === 'spinning' || !canPlay}
              className="block w-full rounded-[18px] py-[17px] text-base font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: gameBg, border: `2px solid ${gameColor}`, boxShadow: `0 14px 30px -14px ${gameColor}88`, color: gameColor }}
            >
              {phase === 'spinning' ? '⏳ En cours...' : `🎮 Jouer — ${GAME_COST} pts`}
            </button>
            {rescan !== null ? <ScanGateNotice message={rescan} accent={accent} heading="Scannez le QR du café pour jouer" /> : error ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p> : <p className="mt-3 text-center text-[11px] leading-relaxed" style={{ color: '#6E665C' }}>Vos gains et vos points sont gardés sur votre compte.</p>}
          </>
        ) : (
          <div className="space-y-2.5">
            <button type="button" onClick={onSpin} className="block w-full rounded-[18px] py-3.5 text-sm font-semibold text-white transition active:scale-[0.99]" style={{ backgroundImage: gradient, boxShadow: `0 14px 30px -14px ${accent}` }}>Rejouer</button>
            {result && <button type="button" onClick={onReview} className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-white py-3.5 text-sm font-semibold transition active:scale-[0.99]" style={{ color: '#1A1410', boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 12px 30px -20px rgba(0,0,0,0.3)' }}>🎁 Revoir mon gain</button>}
          </div>
        )}
      </div>
    </div>
  )
}


/* ── Boutique ────────────────────────────────────────────────────────────────── */
function BoutiqueTab(props: { session: DinerSession | null; businessName: string; accent: string; gradient: string; balance: number; loyaltyActive: boolean; rewards: Reward[]; busyRewardId: string | null; redeemed: { code: string; rewardLabel: string } | null; error: string | null; rescan: string | null; onRedeem: (r: Reward) => void }) {
  const { session, businessName, accent, gradient, balance, loyaltyActive, rewards, busyRewardId, redeemed, error, rescan, onRedeem } = props
  if (!loyaltyActive || rewards.length === 0) return <p className="mt-3 rounded-[18px] bg-white px-4 py-10 text-center text-sm" style={{ color: MUT, boxShadow: SOFT }}>Aucune récompense pour le moment.</p>
  return (
    <div className="pt-3">
      {/* Balance header */}
      <div className="relative overflow-hidden rounded-[20px] p-[18px] text-white" style={{ backgroundImage: gradient, boxShadow: `0 14px 30px -18px ${accent}` }}>
        <div className="pointer-events-none absolute -right-7 -top-8 h-28 w-28 rounded-full bg-white/10" />
        <div className="relative flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85">Votre solde{businessName ? ` · ${businessName}` : ''}</p>
            <div className="mt-0.5 flex items-baseline gap-1.5"><span className="text-[34px] font-bold leading-none tabular-nums">{balance}</span><span className="text-sm text-white/90">points</span></div>
          </div>
          <svg viewBox="0 0 24 24" className="h-9 w-9 text-white/85" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" /><rect x="2" y="7" width="20" height="5" rx="1" /><path d="M12 21V7" /></svg>
        </div>
      </div>

      {rescan !== null ? <ScanGateNotice message={rescan} accent={accent} heading="Scannez le QR du café pour échanger" className="mt-3" /> : error ? <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p> : null}

      {redeemed && (
        <div className="mt-3 rounded-[20px] bg-white p-5 text-center" style={{ boxShadow: SOFT }}>
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}1a`, color: accent }} aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></div>
          <p className="mt-2 font-semibold" style={{ color: INK }}>{redeemed.rewardLabel}</p>
          <div className="mx-auto mt-3 w-fit rounded-xl px-5 py-2.5 font-mono text-xl font-bold tracking-[0.2em]" style={{ background: '#FAF8F5', color: INK }}>{redeemed.code}</div>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: MUT }}>Présentez ce code au comptoir pour récupérer votre récompense. Vos points vous sont rendus si la demande est refusée.</p>
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
              {r.image_url ? (
                <div className="-mx-1 -mt-1 mb-1 aspect-[4/3] overflow-hidden rounded-[14px]" style={{ background: '#FAF8F5' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.image_url} alt={r.label} loading="lazy" className="h-full w-full object-cover" />
                </div>
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}14`, color: accent }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" /><rect x="2" y="7" width="20" height="5" rx="1" /><path d="M12 21V7" /></svg></span>
              )}
              <p className="mt-2.5 line-clamp-2 min-h-[2.4em] text-[13px] font-semibold leading-snug" style={{ color: INK }}>{r.label}</p>
              <p className="mt-0.5 text-xs font-bold" style={{ color: affordable ? accent : FAINT_TEXT }}>{r.points_cost} pts</p>
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
  // undefined → not computed yet (hide); null → no precise time → generic message.
  const [ms, setMs] = useState<number | null | undefined>(undefined)
  useEffect(() => { setMs(msUntilNext(until)); const id = setInterval(() => setMs(msUntilNext(until)), 1000); return () => clearInterval(id) }, [until])
  if (ms === undefined) return null
  return (
    <div role="status" aria-live="polite" aria-atomic="false" className="w-full rounded-[20px] bg-white p-6 text-center" style={{ boxShadow: SOFT }}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${accent}1a`, color: accent }} aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
      </div>
      <h2 className="mt-3 text-lg font-bold" style={{ color: INK }}>Vous avez déjà joué</h2>
      <p className="mx-auto mt-1 max-w-[16rem] text-sm leading-relaxed" style={{ color: MUT }}>Revenez plus tard pour retenter votre chance.</p>
      <div className="mt-4 rounded-2xl px-4 py-3.5" style={{ background: '#FAF8F5' }}>
        {ms === null ? (
          <p className="text-sm font-medium" style={{ color: INK }}>Revenez plus tard&nbsp;!</p>
        ) : (
          <>
            <p aria-hidden="true" className="text-[11px] font-medium uppercase tracking-wide" style={{ color: MUT }}>Prochaine partie dans</p>
            <p aria-hidden="true" className="mt-0.5 text-[32px] font-bold leading-none tabular-nums" style={{ color: accent }}>{fmtCountdown(ms)}</p>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Win popup ───────────────────────────────────────────────────────────────── */
function WinModal({ result, accent, gradient, copied, onCopy, onClose, onSeeCard }: { result: SpinResult; accent: string; gradient: string; copied: boolean; onCopy: () => void; onClose: () => void; onSeeCard: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prevFocused = document.activeElement as HTMLElement | null
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'
    // Move focus into the dialog so the win details (its accessible name) are
    // announced to screen readers and keyboard users land inside the popup.
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); prevFocused?.focus?.() }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <Confetti accent={accent} />
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Vous avez gagné ${result.prizeLabel}, code ${result.code}`} className="relative w-full max-w-[22rem] overflow-hidden rounded-[26px] bg-white px-6 pb-7 pt-8 text-center outline-none animate-[fhwin_.3s_cubic-bezier(0.16,0.84,0.3,1)]" style={{ boxShadow: '0 30px 60px -24px rgba(0,0,0,0.5)' }}>
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

/* ── Countdown — counts to the server's rolling nextPlayAt. No `until` means no
   precise time (the cooldown is a ROLLING window, never a calendar-midnight
   reset), so show a generic "come back later" instead of a misleading midnight
   countdown. ── */
function msUntilNext(until?: string | null): number | null { if (until) { const t = new Date(until).getTime(); if (Number.isFinite(t)) return Math.max(0, t - Date.now()) } return null }
function fmtCountdown(ms: number): string { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60; if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`; if (m > 0) return `${m}m ${sec.toString().padStart(2, '0')}s`; return `${sec}s` }
function NextSpinCountdown({ accent, until = null }: { accent: string; until?: string | null }) {
  // undefined → not computed yet (hide); null → no precise time → generic message.
  const [ms, setMs] = useState<number | null | undefined>(undefined)
  useEffect(() => { setMs(msUntilNext(until)); const id = setInterval(() => setMs(msUntilNext(until)), 1000); return () => clearInterval(id) }, [until])
  if (ms === undefined) return null
  if (ms === null) return (
    <div role="status" aria-live="polite" aria-atomic="false" className="mt-5 rounded-[18px] bg-white px-4 py-4 text-center" style={{ boxShadow: SOFT }}>
      <p className="text-sm font-medium" style={{ color: INK }}>Revenez plus tard pour rejouer&nbsp;!</p>
    </div>
  )
  return (
    <div role="status" aria-live="polite" aria-atomic="false" className="mt-5 rounded-[18px] bg-white px-4 py-4 text-center" style={{ boxShadow: SOFT }}>
      <p aria-hidden="true" className="text-[11px] font-medium uppercase tracking-wide" style={{ color: MUT }}>Prochaine partie dans</p>
      <p aria-hidden="true" className="mt-1 text-3xl font-medium tabular-nums" style={{ color: accent }}>{fmtCountdown(ms)}</p>
      <p className="mt-1 text-[11px]" style={{ color: MUT }}>Revenez bientôt pour rejouer&nbsp;!</p>
    </div>
  )
}
