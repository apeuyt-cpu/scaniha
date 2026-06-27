'use client'

import { useState } from 'react'
import ImageUploader from '@/components/ImageUploader'
import { createClient } from '@/lib/supabase/client'
import { getBusinessSeo } from '@/lib/seo/business-seo'
import { revalidatePublicMenu } from '@/lib/revalidate-menu'

/**
 * Owner-editable SEO / social-share settings for the public menu.
 * Stored under businesses.design_settings.seo (JSONB — no DB migration).
 * Empty fields fall back to sensible defaults (name, tagline, logo).
 */
export default function SeoSettings({
  businessId,
  businessName,
  logoUrl,
  themeId,
  designSettings,
  onUpdate,
}: {
  businessId: string
  businessName: string
  logoUrl: string | null
  themeId?: string | null
  designSettings?: any
  onUpdate?: () => void
}) {
  const supabase = createClient()
  const initial = (designSettings && typeof designSettings === 'object' && designSettings.seo) || {}
  const [metaTitle, setMetaTitle] = useState<string>(initial.metaTitle || '')
  const [metaDescription, setMetaDescription] = useState<string>(initial.metaDescription || '')
  const [shareImage, setShareImage] = useState<string>(initial.shareImage || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Live preview of what Google / WhatsApp will actually show (with fallbacks).
  const preview = getBusinessSeo({
    name: businessName,
    logo_url: logoUrl,
    theme_id: themeId,
    design_settings: { ...(designSettings || {}), seo: { metaTitle, metaDescription, shareImage } },
  })

  async function save() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      // Read fresh design_settings so we never clobber other tabs' edits.
      const { data } = await (supabase.from('businesses') as any).select('design_settings').eq('id', businessId).maybeSingle()
      const current = (data?.design_settings && typeof data.design_settings === 'object' ? data.design_settings : designSettings) || {}
      const seo: Record<string, string> = {}
      if (metaTitle.trim()) seo.metaTitle = metaTitle.trim()
      if (metaDescription.trim()) seo.metaDescription = metaDescription.trim()
      if (shareImage.trim()) seo.shareImage = shareImage.trim()
      const merged = { ...current, seo }
      const { error: dbError } = await (supabase.from('businesses') as any).update({ design_settings: merged }).eq('id', businessId)
      if (dbError) throw dbError
      revalidatePublicMenu() // push the SEO change to the live menu now
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      onUpdate?.()
    } catch (e: any) {
      setError(e?.message || 'Échec de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  const titleCount = (metaTitle || preview.title).length
  const descCount = (metaDescription || preview.description).length

  return (
    <div>
      <h3 className="text-base font-bold text-zinc-900">SEO &amp; Partage</h3>
      <p className="mt-1 text-sm text-zinc-600">
        Personnalisez comment votre menu apparaît sur Google et lors d&apos;un partage (WhatsApp, Facebook…). Laissez vide pour utiliser les valeurs par défaut.
      </p>

      <div className="mt-4 space-y-4">
        {/* Title */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-700">Titre SEO</label>
            <span className={`text-xs ${titleCount > 60 ? 'text-amber-600' : 'text-zinc-400'}`}>{titleCount}/60</span>
          </div>
          <input
            type="text"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            placeholder={preview.title}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Description */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-700">Description SEO</label>
            <span className={`text-xs ${descCount > 160 ? 'text-amber-600' : 'text-zinc-400'}`}>{descCount}/160</span>
          </div>
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            placeholder={preview.description}
            rows={3}
            className="w-full resize-none rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Share image */}
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Image de partage <span className="font-normal text-zinc-400">(1200×630 recommandé)</span></label>
          {shareImage ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shareImage} alt="" className="h-16 w-28 rounded-lg object-cover ring-1 ring-zinc-200" />
              <button type="button" onClick={() => setShareImage('')} className="text-sm font-medium text-red-600 hover:text-red-700">Retirer</button>
            </div>
          ) : (
            <ImageUploader onUploadComplete={(r) => r.secure_url && setShareImage(r.secure_url)} />
          )}
          <p className="mt-1 text-xs text-zinc-400">Par défaut : votre logo.</p>
        </div>

        {/* Live preview */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Aperçu du partage</p>
          <div className="overflow-hidden rounded-lg bg-white ring-1 ring-zinc-200">
            {preview.shareImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.shareImage} alt="" className="h-28 w-full object-cover" />
            ) : (
              <div className="h-28 w-full bg-gradient-to-br from-orange-400 to-amber-300" />
            )}
            <div className="p-3">
              <p className="line-clamp-1 text-sm font-bold text-zinc-900">{preview.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{preview.description}</p>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : saved ? 'Enregistré ✓' : 'Enregistrer le SEO'}
        </button>
      </div>
    </div>
  )
}
