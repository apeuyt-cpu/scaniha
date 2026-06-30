'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import DynamicFavicon from '@/components/admin/DynamicFavicon'
import ActivityTracker from '@/components/admin/ActivityTracker'
import { ToastProvider } from '@/components/admin/kit/Toast'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { PAGE_CAP_FOR_PATH } from '@/lib/access/permissions'
import type { Database } from '@/lib/supabase/database.types'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import MoreSheet from './MoreSheet'
import ImpersonationBanner from './ImpersonationBanner'

/** Page capability gating the current path (longest-prefix match), or null. */
function pageCapFor(pathname: string): string | null {
  let best = ''
  let cap: string | null = null
  for (const href in PAGE_CAP_FOR_PATH) {
    const match = href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(href + '/')
    if (match && href.length > best.length) { best = href; cap = PAGE_CAP_FOR_PATH[href] }
  }
  return cap
}

type Business = Database['public']['Tables']['businesses']['Row']

/**
 * Admin v2 app shell. Replaces AdminLayoutClient: hosts the toast provider,
 * dynamic favicon, activity tracker and the super-admin impersonation banner;
 * renders the persistent sidebar (≥lg) + mobile top-bar/bottom-nav (<lg) around
 * the routed page. The "create your business" form (owner with no café yet) is
 * preserved verbatim.
 */
export default function AdminShell({
  business: initialBusiness,
  impersonating = false,
  capabilities,
  children,
}: {
  business: Business | null
  impersonating?: boolean
  capabilities?: string[] | null
  children: React.ReactNode
}) {
  const { t, dir } = useLocale()
  const pathname = usePathname()
  // Page-access guard (UX block; the data behind each page is protected by the
  // route-level withStaff checks). null capabilities = owner / PIN off = allow all.
  const pageCap = pageCapFor(pathname)
  const pageAllowed = !capabilities || !pageCap || capabilities.indexOf(pageCap) !== -1
  const [business, setBusiness] = useState<Business | null>(initialBusiness)
  const [showCreateForm, setShowCreateForm] = useState(!initialBusiness)
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!businessName.trim()) {
      setError(t('auth.required'))
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/admin/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: businessName.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || t('common.error'))
      setBusiness(data)
      setShowCreateForm(false)
      setBusinessName('')
      window.location.reload()
    } catch (err: any) {
      setError(err.message || t('auth.errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  // Owner with no business yet → the create form (unchanged from the legacy shell).
  if (!business) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center p-4" dir={dir}>
        <div className="mx-auto w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-8 shadow-soft">
          <h1 className="mb-2 text-center text-2xl font-bold text-[var(--ink)]">{t('dashboard.noMenu')}</h1>
          <p className="mb-6 text-center text-[var(--muted)]">{t('dashboard.createBusiness')}</p>

          {showCreateForm ? (
            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <div>
                <label htmlFor="businessName" className="mb-2 block text-sm font-medium text-zinc-700">
                  {t('dashboard.businessNameLabel')}
                </label>
                <input
                  id="businessName"
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-base outline-none transition placeholder:text-zinc-400 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/25"
                  placeholder={t('dashboard.businessNamePlaceholder')}
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="rounded-xl border border-orange-200 bg-[var(--brand-soft)] p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl" aria-hidden="true">🎁</div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--brand-600)]">{t('pricing.freeTrial')}</p>
                    <p className="mt-0.5 text-xs text-orange-700">{t('pricing.freeTrialDesc')}</p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="min-h-[44px] w-full rounded-xl bg-[var(--brand)] px-4 py-3 text-base font-semibold text-white transition hover:bg-[var(--brand-600)] disabled:opacity-50"
              >
                {loading ? t('dashboard.creating') : t('dashboard.createBusinessBtn')}
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="min-h-[44px] w-full rounded-xl bg-[var(--brand)] px-4 py-3 text-base font-semibold text-white transition hover:bg-[var(--brand-600)]"
            >
              {t('dashboard.createBusinessBtn')}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <ToastProvider>
      <div className="admin-shell min-h-screen lg:flex" dir={dir}>
        <DynamicFavicon logoUrl={business.logo_url} businessName={business.name} />
        <ActivityTracker />

        <Sidebar business={business} capabilities={capabilities} />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar business={business} />
          <main
            className={`min-w-0 flex-1 px-4 py-6 sm:px-6 lg:py-8 ${
              impersonating ? 'pb-40 lg:pb-20' : 'pb-28 lg:pb-10'
            }`}
          >
            {pageAllowed ? children : (
              <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-[var(--line)] bg-white p-8 text-center shadow-soft">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                </div>
                <h1 className="text-base font-bold text-[var(--ink)]">Accès non autorisé</h1>
                <p className="mt-1.5 text-sm text-[var(--muted)]">Votre rôle ne permet pas d’accéder à cette page. Demandez au responsable.</p>
                <a href="/admin" className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-600)]">Retour au tableau de bord</a>
              </div>
            )}
          </main>
        </div>

        <BottomNav
          business={business}
          capabilities={capabilities}
          impersonating={impersonating}
          onMore={() => setMoreOpen(true)}
          moreOpen={moreOpen}
        />
        <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} business={business} capabilities={capabilities} />

        {impersonating && <ImpersonationBanner businessName={business.name} />}
      </div>
    </ToastProvider>
  )
}
