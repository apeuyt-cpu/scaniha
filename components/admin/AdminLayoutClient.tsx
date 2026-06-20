'use client'

import { useState } from 'react'
import DynamicFavicon from '@/components/admin/DynamicFavicon'
import ActivityTracker from '@/components/admin/ActivityTracker'
import { ToastProvider } from '@/components/admin/ui/Toast'
import type { Database } from '@/lib/supabase/database.types'
import { useLocale } from '@/lib/i18n/LocaleContext'

type Business = Database['public']['Tables']['businesses']['Row']

interface AdminLayoutClientProps {
  business: Business | null
  impersonating?: boolean
  children: React.ReactNode
}

export default function AdminLayoutClient({ business: initialBusiness, impersonating = false, children }: AdminLayoutClientProps) {
  const { t, dir } = useLocale()
  const [business, setBusiness] = useState<Business | null>(initialBusiness)
  const [showCreateForm, setShowCreateForm] = useState(!initialBusiness)
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      if (!response.ok) {
        throw new Error(data.error || t('common.error'))
      }

      setBusiness(data)
      setShowCreateForm(false)
      setBusinessName('')
      // Refresh the page to load the new business
      window.location.reload()
    } catch (err: any) {
      setError(err.message || t('auth.errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  // Super-admin "Gérer comme l'établissement" → leave + go back to the list.
  const exitImpersonation = async () => {
    try { await fetch('/api/super-admin/impersonate', { method: 'DELETE' }) } catch {}
    window.location.href = '/super-admin/businesses'
  }

  if (!business) {
    return (
      <div className="admin-page flex min-h-screen items-center justify-center bg-zinc-50 p-4" dir={dir}>
        <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-zinc-900 mb-2 text-center">{t('dashboard.noMenu')}</h1>
          <p className="text-zinc-600 text-center mb-6">{t('dashboard.createBusiness')}</p>
          
          {showCreateForm ? (
            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <div>
                <label htmlFor="businessName" className="block text-sm font-medium text-zinc-700 mb-2">
                  {t('dashboard.businessNameLabel')}
                </label>
                <input
                  id="businessName"
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none transition placeholder:text-zinc-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/30"
                  placeholder={t('dashboard.businessNamePlaceholder')}
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
                  {error}
                </div>
              )}

              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl" aria-hidden="true">🎁</div>
                  <div>
                    <p className="text-sm font-semibold text-orange-900">{t('pricing.freeTrial')}</p>
                    <p className="mt-0.5 text-xs text-orange-700">{t('pricing.freeTrialDesc')}</p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="min-h-[44px] w-full rounded-xl bg-orange-500 px-4 py-3 text-base font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
              >
                {loading ? t('dashboard.creating') : t('dashboard.createBusinessBtn')}
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="min-h-[44px] w-full rounded-xl bg-orange-500 px-4 py-3 text-base font-semibold text-white transition hover:bg-orange-600"
            >
              {t('dashboard.createBusinessBtn')}
            </button>
          )}
        </div>
      </div>
    )
  }

  // Home-hub model: no persistent sidebar/bottom-nav. Navigation lives on the
  // Home hub (/admin); sub-pages get a slim top bar via PageShell.
  return (
    <ToastProvider>
      <div className="min-h-screen bg-zinc-50" dir={dir} style={impersonating ? { paddingBottom: 60 } : undefined}>
        <DynamicFavicon logoUrl={business.logo_url} businessName={business.name} />
        <ActivityTracker />
        {children}
        {impersonating && (
          <div className="fixed inset-x-0 bottom-0 z-50 border-t border-orange-300 bg-orange-500 text-white shadow-[0_-6px_20px_rgba(0,0,0,0.12)]">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5" dir="ltr">
              <span className="min-w-0 truncate text-sm font-semibold">
                👁️ Vous gérez « {business.name} » en tant que super-admin
              </span>
              <button onClick={exitImpersonation} className="shrink-0 rounded-lg bg-white/20 px-3 py-1.5 text-sm font-bold transition hover:bg-white/30">
                Quitter
              </button>
            </div>
          </div>
        )}
      </div>
    </ToastProvider>
  )
}
