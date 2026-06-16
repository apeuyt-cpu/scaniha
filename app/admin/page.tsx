'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PaymentRequestModal from '@/components/admin/PaymentRequestModal'
import SectionHeader from '@/components/admin/ui/SectionHeader'
import OnboardingChecklist from '@/components/admin/OnboardingChecklist'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { createClient } from '@/lib/supabase/client'

interface Business {
  id: string
  name: string
  slug: string
  theme_id: string
  status: 'active' | 'paused' | 'pending'
  logo_url: string | null
  expires_at: string | null
  primary_color: string | null
  design_settings: any
  wheel_enabled: boolean
  wheel_visible: boolean
  /** Current plan label ("À vie", "1 an", "Essai gratuit", …). */
  plan?: string | null
}

export default function AdminHome() {
  const { t, dir } = useLocale()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPlanPicker, setShowPlanPicker] = useState(false)
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)

  useEffect(() => {
    fetchBusiness()
  }, [])

  useEffect(() => {
    if (!business?.expires_at) {
      setCountdown(null)
      return
    }
    const update = () => {
      const diff = new Date(business.expires_at!).getTime() - Date.now()
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }
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

  // When the subscription is over, open the renewal form once per visit.
  useEffect(() => {
    if (!business || business.status === 'pending') return
    const expired = business.status === 'paused' || (business.expires_at && new Date(business.expires_at).getTime() <= Date.now())
    if (expired && !sessionStorage.getItem('renewal_prompted')) {
      sessionStorage.setItem('renewal_prompted', '1')
      setShowPlanPicker(true)
    }
  }, [business])

  const fetchBusiness = async () => {
    try {
      const res = await fetch('/api/admin/business')
      const ct = res.headers.get('content-type')
      if (res.ok && ct?.includes('application/json')) {
        setBusiness(await res.json())
      } else if (res.status === 401 || res.status === 403) {
        window.location.href = '/login'
      }
    } catch (err) {
      console.error('Error fetching business:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try { await createClient().auth.signOut() } catch {}
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    )
  }

  if (!business) {
    return (
      <div className="admin-page flex min-h-screen items-center justify-center bg-zinc-50 p-4" dir={dir}>
        <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" /><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-zinc-900">Impossible de charger votre établissement</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Vérifiez votre connexion, puis réessayez. Si le problème persiste, reconnectez-vous.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={() => { setLoading(true); fetchBusiness() }}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Réessayer
            </button>
            <a
              href="/login"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200"
            >
              Se reconnecter
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ─── Pending payment ──────────────────────────────────────────
  if (business.status === 'pending') {
    return (
      <div className="admin-page mx-auto max-w-md p-4 lg:p-8" dir={dir}>
        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-3xl" aria-hidden="true">💳</div>
          <h1 className="text-xl font-bold text-zinc-900">{t('dashboard.subscribeToAccess')}</h1>
          <p className="mt-2 text-sm text-zinc-500">{business.name} — {t('dashboard.pendingPayment')}.</p>
          <button
            onClick={() => setShowPlanPicker(true)}
            className="mt-6 w-full rounded-2xl bg-orange-500 px-6 py-3.5 text-base font-bold text-white transition hover:bg-orange-600"
          >
            {t('pricing.selectPlan')} →
          </button>
        </div>
        <PaymentRequestModal businessId={business.id} open={showPlanPicker} onClose={() => setShowPlanPicker(false)} />
      </div>
    )
  }

  // ─── Active home hub ──────────────────────────────────────────
  const menuUrl = `${window.location.origin}/${business.slug}`
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
      ? { dot: 'bg-amber-500', border: 'border-amber-200', title: 'Expire bientôt', text: `Votre menu expire dans ${timeLeft}.`, btn: 'bg-orange-500 text-white hover:bg-orange-600', cta: 'Renouveler' }
      : { dot: 'bg-green-500', border: 'border-zinc-200', title: 'Abonnement actif', text: timeLeft ? `Expire dans ${timeLeft}.` : 'Votre menu est en ligne.', btn: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200', cta: 'Gérer' }

  return (
    <div className="admin-page mx-auto max-w-2xl space-y-6 p-5 lg:p-8" dir={dir}>
      {/* Identity */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex min-w-0 items-center gap-3">
          {business.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logo_url} alt="" className="h-12 w-12 rounded-2xl border border-zinc-200 bg-white object-contain p-1" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-lg font-bold text-white">
              {business.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-zinc-900">{business.name}</h1>
            <span className="mt-0.5 inline-flex items-center gap-1.5 text-sm">
              <span className={`h-2 w-2 rounded-full ${isActiveStatus ? 'bg-green-500' : 'bg-amber-500'}`} />
              <span className="text-zinc-500">{isActiveStatus ? t('pricing.active') : t('dashboard.menuPaused')}</span>
            </span>
          </div>
        </div>
        <a
          href={menuUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          {t('dashboard.viewMenu')} ↗
        </a>
      </div>

      {/* Subscription + current plan */}
      {isActiveStatus && !business.expires_at ? (
        // Lifetime / no-expiry plan — no countdown, no renewal.
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
            <div className="min-w-0">
              <p className="font-semibold text-zinc-900">Abonnement actif</p>
              <p className="text-sm text-zinc-500">Accès à vie — aucune expiration.</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold text-white">{business.plan || 'À vie'}</span>
        </div>
      ) : countdown ? (
        <div className={`flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 ${sub.border}`}>
          <div className="flex min-w-0 items-start gap-2.5">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${sub.dot} ${isUrgent ? 'animate-pulse' : ''}`} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-zinc-900">{sub.title}</p>
                {business.plan && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-600">{business.plan}</span>}
              </div>
              <p className="text-sm text-zinc-500">{sub.text}</p>
            </div>
          </div>
          <button onClick={() => setShowPlanPicker(true)} className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${sub.btn}`}>
            {sub.cta}
          </button>
        </div>
      ) : null}

      {/* First-run onboarding — hides itself once complete or dismissed */}
      {isActiveStatus && (
        <OnboardingChecklist
          business={{
            id: business.id,
            logo_url: business.logo_url,
            primary_color: business.primary_color,
            design_settings: business.design_settings,
          }}
        />
      )}

      {/* Primary tasks */}
      <div className="space-y-3">
        <TaskRow href="/admin/menu" primary title="Gérer le menu" subtitle="Catégories, plats et prix" icon={<IconMenu />} />
        <TaskRow href="/admin/caisse" title="Caisse" subtitle="Valider les codes et créditer les points" icon={<IconScan />} />
        <TaskRow href="/admin/roulette" title="Roulette" subtitle="Faites tourner la roue au comptoir" icon={<IconWheel />} />
        <TaskRow href="/admin/theme" title="Design" subtitle="Style et couleurs de votre menu" icon={<IconBrush />} />
        <TaskRow href="/admin/share" title="Partage" subtitle="QR code et lien du menu" icon={<IconShare />} />
      </div>

      {/* Secondary, discoverable */}
      <div>
        <SectionHeader title="Plus" />
        <div className="space-y-3.5">
          <TaskRow href="/admin/analytics" title="Statistiques" subtitle="Visites de votre menu" icon={<IconChart />} />
          <TaskRow href="/admin/game" title="Programme de fidélité" subtitle="Roue et points de fidélité" icon={<IconGift />} />
          <TaskRow href="/admin/settings" title="Réglages" subtitle="Lien du menu, SEO, préférences" icon={<IconGear />} />
        </div>
      </div>

      {/* Logout */}
      <button
        type="button"
        onClick={handleSignOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600 transition hover:bg-red-100 active:scale-[0.99]"
      >
        <IconLogout /> Se déconnecter
      </button>

      {/* This branch only renders for active/paused businesses (pending returns
          earlier), i.e. existing customers renewing — they already have their QR
          supports, so the add-ons upsell is hidden (only the plan/pricing shows). */}
      <PaymentRequestModal businessId={business.id} open={showPlanPicker} onClose={() => setShowPlanPicker(false)} existingCustomer />
    </div>
  )
}

/* ---------- row + icons ---------- */

function TaskRow({ href, title, subtitle, icon, primary }: { href: string; title: string; subtitle: string; icon: React.ReactNode; primary?: boolean }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm active:scale-[0.995]"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${primary ? 'bg-orange-50 text-orange-600' : 'bg-zinc-100 text-zinc-600'}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-zinc-900">{title}</span>
        <span className="block truncate text-sm text-zinc-500">{subtitle}</span>
      </span>
      <svg className="text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  )
}

const iconProps = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
const IconMenu = () => <svg {...iconProps}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
const IconScan = () => <svg {...iconProps}><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M3 12h18" /></svg>
const IconBrush = () => <svg {...iconProps}><path d="M9.5 14.5 4 20M14 4l6 6M14.5 9.5 7 17a3 3 0 0 1-3 0 3 3 0 0 1 0-3l7.5-7.5" /><circle cx="17" cy="7" r="1.2" fill="currentColor" stroke="none" /></svg>
const IconShare = () => <svg {...iconProps}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3M20 14v3M14 20h3M20 20h.01M17 17h.01" /></svg>
const IconChart = () => <svg {...iconProps}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
const IconWheel = () => <svg {...iconProps}><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /></svg>
const IconGift = () => <svg {...iconProps}><path d="M20 12v8H4v-8M2 7h20v5H2zM12 22V7M12 7S10.5 3 8.5 3 6 5 6 5s1 2 2.5 2M12 7s1.5-4 3.5-4S18 5 18 5s-1 2-2.5 2" /></svg>
const IconLogout = () => <svg {...iconProps} width={18} height={18}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
const IconGear = () => <svg {...iconProps}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
