'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PaymentRequestModal from '@/components/admin/PaymentRequestModal'
import OnboardingChecklist from '@/components/admin/OnboardingChecklist'
import StatCard from '@/components/admin/kit/StatCard'
import Spinner from '@/components/admin/kit/Spinner'
import { getProductMode, isOrderingLive } from '@/lib/design-settings'
import { isOrderActive } from '@/lib/orders'
import {
  IconMenu, IconReceipt, IconScan, IconWheel, IconGift, IconShare, IconChart, IconCounter, IconChevron,
} from '@/components/admin/shell/icons'

interface Business {
  id: string
  name: string
  slug: string
  status: 'active' | 'paused' | 'pending'
  logo_url: string | null
  expires_at: string | null
  primary_color: string | null
  design_settings: any
  plan?: string | null
}

interface FidStats {
  playsToday: number
  playsWeek: number
  winsPending: number
  redemptionsPending: number
  dinersTotal: number
  dinersWeek: number
  purchasesWeek: number
}

/**
 * Admin v2 home — a live, plan-aware dashboard. Replaces the legacy tile hub.
 * Pulls from existing endpoints only (no new APIs): menu views, fidelity stats,
 * active orders, and wheel status. Keeps the load-bearing subscription
 * countdown + renewal modal + onboarding checklist from the old hub.
 */
export default function Dashboard() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPlanPicker, setShowPlanPicker] = useState(false)
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)

  // Live widgets
  const [views, setViews] = useState<number | null>(null)
  const [activeOrders, setActiveOrders] = useState<number | null>(null)
  const [activeCalls, setActiveCalls] = useState<number | null>(null)
  const [fid, setFid] = useState<FidStats | null>(null)
  const [wheelOn, setWheelOn] = useState<boolean | null>(null)
  const [loyaltyOn, setLoyaltyOn] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/business')
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          if (!cancelled) setBusiness(await res.json())
        } else if (res.status === 401 || res.status === 403) {
          window.location.href = '/login'
        }
      } catch (e) {
        console.error('Error fetching business:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Countdown (same logic as the legacy hub).
  useEffect(() => {
    if (!business?.expires_at) { setCountdown(null); return }
    const update = () => {
      const diff = new Date(business.expires_at!).getTime() - Date.now()
      if (diff <= 0) { setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return }
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [business?.expires_at])

  // Open the renewal form once per visit when the subscription is over.
  useEffect(() => {
    if (!business || business.status === 'pending') return
    const expired = business.status === 'paused' || (business.expires_at && new Date(business.expires_at).getTime() <= Date.now())
    if (expired && !sessionStorage.getItem('renewal_prompted')) {
      sessionStorage.setItem('renewal_prompted', '1')
      setShowPlanPicker(true)
    }
  }, [business])

  // Live widgets — fetched once the business (and its plan) is known.
  useEffect(() => {
    if (!business || business.status !== 'active') return
    const products = getProductMode(business)
    const hasMenu = products !== 'fidelity'
    const hasFidelity = products !== 'menu'
    const orderingLive = isOrderingLive(business)
    let cancelled = false

    if (hasMenu) {
      fetch('/api/admin/analytics?period=today')
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (!cancelled && j) setViews(j.total ?? 0) })
        .catch(() => {})
    }
    if (orderingLive) {
      fetch('/api/admin/orders')
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (cancelled || !j) return
          if (j.orders) setActiveOrders(j.orders.filter((o: any) => isOrderActive(o.status)).length)
          setActiveCalls(Array.isArray(j.calls) ? j.calls.length : 0)
        })
        .catch(() => {})
    }
    if (hasFidelity) {
      fetch('/api/admin/fidelity-stats')
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (!cancelled && j?.hasFidelity && j.stats) setFid(j.stats) })
        .catch(() => {})
      fetch(`/api/game/${business.slug}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (!cancelled && j) { setWheelOn(Boolean(j.active)); setLoyaltyOn(Boolean(j.loyaltyActive)) } })
        .catch(() => {})
    }
    return () => { cancelled = true }
  }, [business])

  if (loading) return <Spinner />

  if (!business) {
    return (
      <div className="mx-auto max-w-sm rounded-2xl border border-[var(--line)] bg-white p-8 text-center shadow-soft">
        <h1 className="text-lg font-bold text-[var(--ink)]">Impossible de charger votre établissement</h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">Vérifiez votre connexion, puis réessayez.</p>
        <button
          onClick={() => { setLoading(true); window.location.reload() }}
          className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-600)]"
        >
          Réessayer
        </button>
      </div>
    )
  }

  // ─── Pending payment ──────────────────────────────────────────
  if (business.status === 'pending') {
    return (
      <div className="mx-auto max-w-md">
        <div className="mt-6 rounded-3xl border border-[var(--line)] bg-white p-8 text-center shadow-soft">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-3xl" aria-hidden="true">💳</div>
          <h1 className="text-xl font-bold text-[var(--ink)]">Abonnez-vous pour accéder à votre tableau de bord</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{business.name} — paiement en attente.</p>
          <button
            onClick={() => setShowPlanPicker(true)}
            className="mt-6 w-full rounded-2xl bg-[var(--brand)] px-6 py-3.5 text-base font-bold text-white transition hover:bg-[var(--brand-600)]"
          >
            Choisir une formule →
          </button>
        </div>
        <PaymentRequestModal businessId={business.id} open={showPlanPicker} onClose={() => setShowPlanPicker(false)} />
      </div>
    )
  }

  // ─── Active dashboard ─────────────────────────────────────────
  const products = getProductMode(business)
  const hasMenu = products !== 'fidelity'
  const hasFidelity = products !== 'menu'
  const orderingLive = isOrderingLive(business)
  const isActiveStatus = business.status === 'active'

  const isExpired = !!countdown && countdown.days === 0 && countdown.hours === 0 && countdown.minutes === 0 && countdown.seconds === 0
  const isUrgent = !!countdown && !isExpired && countdown.days <= 3
  const timeLeft = !countdown || isExpired
    ? ''
    : countdown.days > 0
      ? `${countdown.days} jour${countdown.days > 1 ? 's' : ''}`
      : countdown.hours > 0
        ? `${countdown.hours} heure${countdown.hours > 1 ? 's' : ''}`
        : `${countdown.minutes} min`

  const sub = isExpired
    ? { dot: 'bg-red-500', border: 'border-red-200', title: 'Abonnement expiré', text: 'Renouvelez pour réafficher votre menu.', btn: 'bg-red-600 text-white hover:bg-red-700', cta: 'Renouveler' }
    : isUrgent
      ? { dot: 'bg-amber-500', border: 'border-amber-200', title: 'Expire bientôt', text: `Votre menu expire dans ${timeLeft}.`, btn: 'bg-[var(--brand)] text-white hover:bg-[var(--brand-600)]', cta: 'Renouveler' }
      : { dot: 'bg-green-500', border: 'border-[var(--line)]', title: 'Abonnement actif', text: timeLeft ? `Expire dans ${timeLeft}.` : 'Votre menu est en ligne.', btn: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200', cta: 'Gérer' }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)]">Bonjour 👋</h1>
        <p className="mt-0.5 text-sm text-[var(--muted)]">Voici un aperçu de {business.name}.</p>
      </div>

      {/* Subscription */}
      {isActiveStatus && !business.expires_at ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-soft">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
            <div className="min-w-0">
              <p className="font-semibold text-[var(--ink)]">Abonnement actif</p>
              <p className="text-sm text-[var(--muted)]">Accès à vie — aucune expiration.</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold text-white">{business.plan || 'À vie'}</span>
        </div>
      ) : countdown ? (
        <div className={`flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-soft ${sub.border}`}>
          <div className="flex min-w-0 items-start gap-2.5">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${sub.dot} ${isUrgent ? 'animate-pulse' : ''}`} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-[var(--ink)]">{sub.title}</p>
                {business.plan && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-600">{business.plan}</span>}
              </div>
              <p className="text-sm text-[var(--muted)]">{sub.text}</p>
            </div>
          </div>
          <button onClick={() => setShowPlanPicker(true)} className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${sub.btn}`}>
            {sub.cta}
          </button>
        </div>
      ) : null}

      {/* Onboarding */}
      {isActiveStatus && (
        <OnboardingChecklist
          business={{ id: business.id, logo_url: business.logo_url, primary_color: business.primary_color, design_settings: business.design_settings }}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {hasMenu && (
          <StatCard label="Vues du menu" value={views ?? '—'} hint="aujourd'hui" tone="brand" icon={<IconChart width={16} height={16} />} href="/admin/statistiques" />
        )}
        {orderingLive && (
          <StatCard label="Commandes actives" value={activeOrders ?? '—'} hint="à traiter" tone={activeOrders ? 'amber' : 'neutral'} icon={<IconReceipt width={16} height={16} />} href="/admin/commandes" />
        )}
        {orderingLive && !!activeCalls && (
          <StatCard label="Appels serveur" value={activeCalls} hint="en attente" tone="amber" icon={<IconScan width={16} height={16} />} href="/admin/commandes" />
        )}
        {hasFidelity && (
          <>
            <StatCard label="Parties jouées" value={fid?.playsToday ?? '—'} hint="aujourd'hui" tone="brand" icon={<IconWheel width={16} height={16} />} href="/admin/fidelite?tab=roue" />
            <StatCard label="Lots à remettre" value={fid?.winsPending ?? '—'} hint="en attente" tone={fid?.winsPending ? 'amber' : 'neutral'} icon={<IconGift width={16} height={16} />} href="/admin/comptoir" />
            <StatCard label="Récompenses à remettre" value={fid?.redemptionsPending ?? '—'} hint="en attente" tone={fid?.redemptionsPending ? 'amber' : 'neutral'} icon={<IconScan width={16} height={16} />} href="/admin/caisse" />
            <StatCard label="Clients" value={fid?.dinersTotal ?? '—'} hint={fid ? `+${fid.dinersWeek} cette semaine` : 'au total'} tone="neutral" icon={<IconCounter width={16} height={16} />} href="/admin/statistiques" />
          </>
        )}
      </div>

      {/* Status + quick actions */}
      <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-soft sm:p-6">
        <h2 className="text-sm font-bold text-[var(--ink)]">État de votre établissement</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {hasMenu && <StatusPill on={isActiveStatus} label={isActiveStatus ? 'Menu en ligne' : 'Menu en pause'} />}
          {orderingLive && <StatusPill on label="Commande à table active" />}
          {orderingLive && !!activeCalls && (
            <Link href="/admin/commandes" className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              {activeCalls} appel{activeCalls > 1 ? 's' : ''} serveur
            </Link>
          )}
          {hasFidelity && <StatusPill on={!!loyaltyOn} label={loyaltyOn ? 'Fidélité active' : 'Fidélité inactive'} />}
          {hasFidelity && <StatusPill on={!!wheelOn} label={wheelOn ? 'Roue active' : 'Roue inactive'} />}
        </div>

        <h2 className="mt-6 text-sm font-bold text-[var(--ink)]">Actions rapides</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {hasMenu && <QuickAction href="/admin/menu" icon={<IconMenu width={18} height={18} />} title="Gérer le menu" subtitle="Catégories, plats et prix" />}
          {orderingLive && <QuickAction href="/admin/commandes" icon={<IconReceipt width={18} height={18} />} title="Commandes" subtitle="Suivre les commandes à table" />}
          {hasFidelity && <QuickAction href="/admin/caisse" icon={<IconScan width={18} height={18} />} title="Ouvrir la caisse" subtitle="Créditer des points, valider un code" />}
          {hasFidelity && <QuickAction href="/admin/fidelite" icon={<IconGift width={18} height={18} />} title="Programme de fidélité" subtitle="Roue, points et récompenses" />}
          {hasMenu && <QuickAction href="/admin/design" icon={<IconWheel width={18} height={18} />} title="Design & marque" subtitle="Logo, couleurs, style" />}
          <QuickAction href="/admin/partage" icon={<IconShare width={18} height={18} />} title="Partage & QR" subtitle="Codes QR et liens" />
        </div>
      </section>

      <PaymentRequestModal businessId={business.id} open={showPlanPicker} onClose={() => setShowPlanPicker(false)} existingCustomer />
    </div>
  )
}

function StatusPill({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${on ? 'border-green-200 bg-green-50 text-green-700' : 'border-[var(--line)] bg-zinc-50 text-zinc-500'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-green-500' : 'bg-zinc-300'}`} />
      {label}
    </span>
  )
}

function QuickAction({ href, icon, title, subtitle }: { href: string; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-xl border border-[var(--line)] bg-white p-3.5 transition hover:-translate-y-0.5 hover:shadow-soft">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-600)]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[var(--ink)]">{title}</span>
        <span className="block truncate text-xs text-[var(--muted)]">{subtitle}</span>
      </span>
      <IconChevron width={18} height={18} />
    </Link>
  )
}
