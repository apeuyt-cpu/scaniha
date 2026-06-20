'use client'

import { useEffect, useState } from 'react'
import SeoSettings from '@/components/admin/SeoSettings'
import LogoUpload from '@/components/business/LogoUpload'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { useToast } from '@/components/admin/ui/Toast'
import { inputClass } from '@/components/admin/ui/Field'
import { revalidatePublicMenu } from '@/lib/revalidate-menu'
import { getProductMode } from '@/lib/design-settings'

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
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const supabase = createClient()
  // Fidélité-only cafés have no menu → hide menu-only sections.
  const mode = getProductMode(business)

  // Business name — editable here as well as in « Design » → Marque.
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(business.name)
  const [savingName, setSavingName] = useState(false)

  // Keep the buffer in sync with the canonical name unless actively editing.
  useEffect(() => {
    if (!editingName) setName(business.name)
  }, [business.name, editingName])

  const handleSaveName = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("Le nom de l'établissement ne peut pas être vide")
      return
    }
    setSavingName(true)
    try {
      const { error } = await (supabase.from('businesses') as any).update({ name: trimmed }).eq('id', business.id)
      if (error) throw error
      revalidatePublicMenu() // push the new name to the live menu now
      setEditingName(false)
      onUpdate()
      toast.success("Nom de l'établissement enregistré")
    } catch (err: any) {
      toast.error(err.message || 'Échec de la mise à jour')
    } finally {
      setSavingName(false)
    }
  }

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
      {/* Nom de l'établissement — editable identity */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-bold text-zinc-900">Nom de l&apos;établissement</h2>
        <p className="mt-0.5 text-sm text-zinc-500">Le nom affiché sur votre menu public.</p>
        <div className="mt-4">
          {editingName ? (
            <div className="space-y-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className={inputClass}
                autoFocus
                aria-label="Nom de l'établissement"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
                >
                  {savingName ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button
                  onClick={() => { setName(business.name); setEditingName(false) }}
                  disabled={savingName}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3">
              <span className="truncate text-sm text-zinc-900">{business.name}</span>
              <button
                onClick={() => setEditingName(true)}
                className="shrink-0 text-sm font-semibold text-orange-600 transition hover:text-orange-700"
              >
                Modifier
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Logo & marque */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-bold text-zinc-900">Logo</h2>
        <p className="mt-0.5 text-sm text-zinc-500">Il s&apos;affiche en haut de votre page (menu et fidélité).</p>
        <div className="mt-4">
          <LogoUpload businessId={business.id} currentLogoUrl={business.logo_url} onLogoUpdated={onUpdate} />
        </div>
      </section>

      {/* Lien du menu — menu-only (a fidélité-only café has no menu) */}
      {mode !== 'fidelity' && (
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
          <p className="mt-1.5 text-xs text-zinc-400">Les réseaux et le style du menu se règlent dans « Design ».</p>
        </div>
      </section>
      )}

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
