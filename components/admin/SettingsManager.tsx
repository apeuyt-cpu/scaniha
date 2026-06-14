'use client'

import { useState } from 'react'
import SeoSettings from '@/components/admin/SeoSettings'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/lib/i18n/LocaleContext'

interface Business {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color?: string | null
  theme_id?: string | null
  design_settings?: any
}

export default function SettingsManager({ business, onUpdate }: { business: Business; onUpdate: () => void }) {
  const { t, dir } = useLocale()
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  const menuUrl = typeof window !== 'undefined' ? `${window.location.origin}/${business.slug}` : `/${business.slug}`

  const copyLink = () => {
    navigator.clipboard.writeText(menuUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch {}
    window.location.href = '/login'
  }

  return (
    <div className="space-y-5" dir={dir}>
      {/* Lien du menu — account info */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-bold text-zinc-900">Lien du menu</h2>
        <p className="mt-0.5 text-sm text-zinc-500">Le lien public de votre menu en ligne.</p>
        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-zinc-700">{t('settings.menuLink')}</label>
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3">
            <code className="min-w-0 flex-1 truncate text-sm text-zinc-600" dir="ltr">{menuUrl}</code>
            <button onClick={copyLink} className={`shrink-0 text-sm font-semibold transition ${copied ? 'text-green-600' : 'text-orange-600 hover:text-orange-700'}`}>
              {copied ? 'Copié ✓' : t('settings.copy')}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-zinc-400">Le logo, le nom, les réseaux et le style du menu se règlent dans « Design ».</p>
        </div>
      </section>

      {/* SEO & partage */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <SeoSettings
          businessId={business.id}
          businessName={business.name}
          logoUrl={business.logo_url}
          themeId={business.theme_id}
          designSettings={business.design_settings}
          onUpdate={onUpdate}
        />
      </section>

      {/* Préférences */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-bold text-zinc-900">Préférences</h2>
        <p className="mt-0.5 text-sm text-zinc-500">Langue, devise et session.</p>
        <div className="mt-4 divide-y divide-zinc-100">
          <InfoRow label="Langue" value="Français" />
          <InfoRow label="Devise" value="Dinar tunisien (TND)" />
          <div className="flex items-center justify-between gap-3 pt-3">
            <div>
              <p className="text-sm font-medium text-zinc-800">Session</p>
              <p className="text-xs text-zinc-400">Déconnectez-vous de votre compte sur cet appareil.</p>
            </div>
            <button
              onClick={signOut}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm font-medium text-zinc-900">{value}</span>
    </div>
  )
}
