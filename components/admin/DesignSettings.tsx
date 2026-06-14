'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadImage } from '@/lib/storage'
import {
  DESIGN_ACCENTS,
  DESIGN_EXTRAS,
  getDesignSettings,
  isDesignId,
  type DesignId,
  type DesignSettings as Settings,
} from '@/lib/design-settings'

interface Business {
  id: string
  theme_id: string
  design_settings?: any
}

export const DESIGN_NAMES: Record<DesignId, string> = {
  design1: 'Spécial du Jour',
  design2: 'Chef Premium',
  design3: 'Coloré',
  design6: 'Liste Élégante',
  design11: 'Vitrine Immersive',
  design12: 'Terroir',
}

/* ------------------------------------------------------------------ */
/*  Controlled state hook — lifted so the live preview (in the parent  */
/*  DesignStudio) reflects unsaved changes immediately.               */
/* ------------------------------------------------------------------ */

export interface DesignSettingsController {
  s: Settings
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  setExtra: (key: string, value: any) => void
  extraValue: (key: string, def: any) => any
  toggleFeatured: (id: string | number) => void
  save: () => Promise<void>
  saving: boolean
  saved: boolean
  error: string | null
  items: { id: string | number; name: string; category: string }[]
  itemsLoaded: boolean
  uploadingCover: boolean
  handleCoverFile: (file: File | undefined) => Promise<void>
  showDescriptions: boolean
}

export function useDesignSettings(
  business: Business,
  designId: DesignId,
  settingsMap: Record<string, any>,
  onSaved: (id: string, settings: Settings) => void
): DesignSettingsController {
  const supabase = createClient()

  const [s, setS] = useState<Settings>(() => getDesignSettings({ design_settings: settingsMap }, designId))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<{ id: string | number; name: string; category: string }[]>([])
  const [itemsLoaded, setItemsLoaded] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  const showDescriptions = designId === 'design1' || designId === 'design2'

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setS((cur) => ({ ...cur, [key]: value }))
    setSaved(false)
  }

  const setExtra = (key: string, value: any) => {
    setS((cur) => ({ ...cur, extras: { ...(cur.extras || {}), [key]: value } }))
    setSaved(false)
  }

  const extraValue = (key: string, def: any) => {
    const v = s.extras?.[key]
    return v === undefined || v === null ? def : v
  }

  async function handleCoverFile(file: File | undefined) {
    if (!file) return
    setUploadingCover(true)
    setError(null)
    try {
      const url = await uploadImage(file, `covers/${business.id}`)
      set('coverImage', url)
    } catch (err: any) {
      setError(err.message || 'Échec du téléversement de la bannière')
    } finally {
      setUploadingCover(false)
    }
  }

  // Lazy-load items for the manual showcase picker.
  useEffect(() => {
    if (s.source !== 'manual' || itemsLoaded) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name, items(id, name, available)')
        .eq('business_id', business.id)
        .order('position', { ascending: true })
      if (cancelled) return
      const flat: { id: string | number; name: string; category: string }[] = []
      for (const cat of (data as any[]) || []) {
        for (const it of cat.items || []) {
          if (it && it.available !== false) flat.push({ id: it.id, name: it.name, category: cat.name })
        }
      }
      setItems(flat)
      setItemsLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [s.source, itemsLoaded, business.id, supabase])

  const toggleFeatured = (id: string | number) => {
    setS((cur) => {
      const exists = cur.featuredIds.some((x) => String(x) === String(id))
      return {
        ...cur,
        featuredIds: exists ? cur.featuredIds.filter((x) => String(x) !== String(id)) : [...cur.featuredIds, id],
      }
    })
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      // Re-read the live map right before writing so we never clobber settings
      // another tab (or an older session) saved for OTHER designs — only the
      // current design's key is replaced.
      const { data: fresh } = await (supabase.from('businesses') as any)
        .select('design_settings')
        .eq('id', business.id)
        .single()
      const liveMap =
        fresh?.design_settings && typeof fresh.design_settings === 'object' ? fresh.design_settings : settingsMap
      const merged = { ...settingsMap, ...liveMap, [designId]: s }
      const { data, error: dbError } = await (supabase.from('businesses') as any)
        .update({ design_settings: merged })
        .eq('id', business.id)
        .select('id')
      if (dbError) throw new Error(dbError.message)
      if (!data || data.length === 0) throw new Error("Échec de l'enregistrement. Vérifiez vos accès.")
      // Lift the saved settings so the parent's map stays current for other designs.
      onSaved(designId, s)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setError(err?.message || 'Une erreur est survenue.')
    } finally {
      setSaving(false)
    }
  }

  return {
    s,
    set,
    setExtra,
    extraValue,
    toggleFeatured,
    save,
    saving,
    saved,
    error,
    items,
    itemsLoaded,
    uploadingCover,
    handleCoverFile,
    showDescriptions,
  }
}

/* ------------------------------------------------------------------ */
/*  Tab content: per-design appearance controls (everything that is    */
/*  NOT a color — colors live in the "Couleurs & dégradé" tab).        */
/* ------------------------------------------------------------------ */

export function ModelControls({ ctrl, designId }: { ctrl: DesignSettingsController; designId: DesignId }) {
  const { s, set, setExtra, extraValue, toggleFeatured, save, saving, saved, error, items, itemsLoaded, uploadingCover, handleCoverFile, showDescriptions } = ctrl
  const extraDefs = DESIGN_EXTRAS[designId] || []

  return (
    <div className="space-y-5">
      {/* Cover banner */}
      <Field label="Image de bannière">
        {s.coverImage ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.coverImage} alt="Bannière" className="h-16 w-28 rounded-xl object-cover ring-1 ring-zinc-200" />
            <button
              type="button"
              onClick={() => set('coverImage', null)}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Retirer
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-600 hover:border-orange-400 hover:text-orange-600">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingCover}
              onChange={(e) => handleCoverFile(e.target.files?.[0])}
            />
            {uploadingCover ? 'Téléversement…' : '+ Ajouter une bannière'}
          </label>
        )}
      </Field>

      {/* Tagline */}
      <Field label="Slogan / message d'accueil">
        <input
          value={s.tagline}
          onChange={(e) => set('tagline', e.target.value)}
          placeholder="Ex. Découvrez nos spécialités"
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </Field>

      <Toggle label="Afficher le logo" checked={s.showLogo} onChange={(v) => set('showLogo', v)} />

      {/* Design-specific options */}
      {extraDefs.length > 0 && (
        <>
          <div className="border-t border-zinc-100" />
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Options spécifiques à « {DESIGN_NAMES[designId]} »
          </p>
          {extraDefs.map((opt) => {
            if (opt.type === 'toggle') {
              return (
                <Toggle
                  key={opt.key}
                  label={opt.label}
                  hint={opt.hint}
                  checked={Boolean(extraValue(opt.key, opt.default))}
                  onChange={(v) => setExtra(opt.key, v)}
                />
              )
            }
            if (opt.type === 'choice') {
              const cur = String(extraValue(opt.key, opt.default))
              return (
                <Field key={opt.key} label={opt.label}>
                  <div className="flex flex-wrap gap-2">
                    {(opt.choices || []).map((c) => (
                      <Radio key={c.value} label={c.label} checked={cur === c.value} onClick={() => setExtra(opt.key, c.value)} />
                    ))}
                  </div>
                  {opt.hint && <p className="mt-1.5 text-xs text-zinc-400">{opt.hint}</p>}
                </Field>
              )
            }
            return (
              <Field key={opt.key} label={opt.label}>
                <input
                  value={String(extraValue(opt.key, opt.default) ?? '')}
                  onChange={(e) => setExtra(opt.key, e.target.value)}
                  placeholder={opt.placeholder}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {opt.hint && <p className="mt-1.5 text-xs text-zinc-400">{opt.hint}</p>}
              </Field>
            )
          })}
        </>
      )}

      <div className="border-t border-zinc-100" />

      {/* Showcase toggle */}
      <Toggle
        label="Diaporama « À la une »"
        hint="Fait défiler automatiquement une sélection de plats."
        checked={s.showcase}
        onChange={(v) => set('showcase', v)}
      />

      {s.showcase && (
        <div className="space-y-5 rounded-xl bg-zinc-50 p-4">
          {/* Title + subtitle */}
          <Field label="Titre">
            <input
              value={s.title}
              onChange={(e) => set('title', e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </Field>
          <Field label="Sous-titre (optionnel)">
            <input
              value={s.subtitle}
              onChange={(e) => set('subtitle', e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </Field>

          {/* Source */}
          <Field label="Contenu du diaporama">
            <div className="flex gap-2">
              <Radio label="Aléatoire" checked={s.source === 'random'} onClick={() => set('source', 'random')} />
              <Radio label="Choisis" checked={s.source === 'manual'} onClick={() => set('source', 'manual')} />
            </div>
          </Field>

          {s.source === 'manual' && (
            <Field label={`Plats à la une (${s.featuredIds.length} sélectionné${s.featuredIds.length > 1 ? 's' : ''})`}>
              {!itemsLoaded ? (
                <p className="text-sm text-zinc-400">Chargement des plats…</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-zinc-400">Aucun plat. Ajoutez des articles dans le menu d&apos;abord.</p>
              ) : (
                <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-2">
                  {items.map((it) => {
                    const checked = s.featuredIds.some((x) => String(x) === String(it.id))
                    return (
                      <label
                        key={it.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleFeatured(it.id)}
                          className="h-4 w-4 accent-orange-500"
                        />
                        <span className="text-zinc-900">{it.name}</span>
                        <span className="text-xs text-zinc-400">· {it.category}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </Field>
          )}

          {/* Auto-slide + speed */}
          <Toggle label="Défilement automatique" checked={s.autoSlide} onChange={(v) => set('autoSlide', v)} />
          {s.autoSlide && (
            <Field label={`Vitesse : ${(s.intervalMs / 1000).toFixed(0)} s`}>
              <input
                type="range"
                min={2000}
                max={8000}
                step={1000}
                value={s.intervalMs}
                onChange={(e) => set('intervalMs', Number(e.target.value))}
                className="w-full accent-orange-500"
              />
            </Field>
          )}
        </div>
      )}

      {/* Display toggles */}
      <Toggle label="Afficher les prix" checked={s.showPrices} onChange={(v) => set('showPrices', v)} />
      {showDescriptions && (
        <Toggle
          label="Afficher les descriptions"
          checked={s.showDescriptions}
          onChange={(v) => set('showDescriptions', v)}
        />
      )}
      <Toggle
        label="Afficher les articles épuisés"
        hint="Affiche les plats indisponibles (grisés) au lieu de les masquer."
        checked={s.showSoldOut}
        onChange={(v) => set('showSoldOut', v)}
      />

      <div className="border-t border-zinc-100" />

      {/* Contact / hours footer */}
      <Toggle
        label="Pied de page : contact & horaires"
        hint="Affiche téléphone, adresse, horaires et réseaux sociaux."
        checked={s.contactEnabled}
        onChange={(v) => set('contactEnabled', v)}
      />
      {s.contactEnabled && (
        <div className="space-y-3 rounded-xl bg-zinc-50 p-4">
          <Field label="Téléphone">
            <input
              value={s.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="+216 ..."
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </Field>
          <Field label="Adresse">
            <input
              value={s.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Rue, ville"
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </Field>
          <Field label="Horaires">
            <input
              value={s.hours}
              onChange={(e) => set('hours', e.target.value)}
              placeholder="Lun–Dim · 9h–23h"
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </Field>
          <p className="text-xs text-zinc-400">
            Les réseaux sociaux proviennent de l&apos;onglet « Marque ».
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer les réglages'}
        </button>
        {saved && <span className="text-sm font-medium text-green-600">Enregistré ✓</span>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Classic-theme colour form (non-design themes: classic/minimal/dark)*/
/*  Writes businesses.primary_color. Kept fully working.               */
/* ------------------------------------------------------------------ */

export function ClassicColorForm({ businessId }: { businessId: string }) {
  const supabase = createClient()
  const CLASSIC_DEFAULT = '#F47B20'
  const [color, setColor] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await (supabase.from('businesses') as any).select('primary_color').eq('id', businessId).single()
      if (!cancelled) {
        setColor(data?.primary_color || null)
        setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [businessId, supabase])

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const { error: e } = await (supabase.from('businesses') as any).update({ primary_color: color || null }).eq('id', businessId)
      if (e) throw new Error(e.message)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setError(err?.message || 'Une erreur est survenue.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 lg:p-6">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-zinc-900">Couleur du thème</h3>
        <p className="text-sm text-zinc-500">Choisissez la couleur principale de ce thème classique.</p>
      </div>
      <Field label="Couleur principale">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color || CLASSIC_DEFAULT}
            disabled={!loaded}
            onChange={(e) => {
              setColor(e.target.value)
              setSaved(false)
            }}
            className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-200 disabled:opacity-50"
          />
          <span className="text-xs text-zinc-400">{color || 'Couleur par défaut'}</span>
          {color && (
            <button
              type="button"
              onClick={() => {
                setColor(null)
                setSaved(false)
              }}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-800"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </Field>
      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !loaded}
          className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer la couleur'}
        </button>
        {saved && <span className="text-sm font-medium text-green-600">Enregistré ✓</span>}
      </div>
    </div>
  )
}

export function isDesign(id: string): id is DesignId {
  return isDesignId(id)
}

export { DESIGN_ACCENTS }

/* ---------- small UI helpers (shared across the design tabs) ---------- */

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-700">{label}</label>
      {children}
    </div>
  )
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <span>
        <span className="block text-sm font-medium text-zinc-800">{label}</span>
        {hint && <span className="block text-xs text-zinc-400">{hint}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-orange-500' : 'bg-zinc-300'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
        />
      </span>
    </button>
  )
}

export function Radio({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
        checked ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-zinc-200 text-zinc-700 hover:border-zinc-300'
      }`}
    >
      {label}
    </button>
  )
}
