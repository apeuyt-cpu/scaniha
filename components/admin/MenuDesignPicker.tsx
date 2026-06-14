'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getTheme } from '@/lib/themes'

// The menu design templates (rendered as live iframe previews).
const DESIGNS = [
  { id: 'design1', n: '1', name: 'Spécial du Jour', desc: 'Chaleureux et interactif, avec plat surprise.' },
  { id: 'design6', n: '6', name: 'Liste Élégante', desc: 'Typographie raffinée, esprit carte de restaurant.' },
  { id: 'design11', n: '11', name: 'Vitrine Immersive', desc: 'Couverture plein écran, ambiance premium animée.' },
  { id: 'design12', n: '12', name: 'Terroir', desc: 'Bandeau catégories photo + cartes rondes, esprit artisanal.' },
] as const

// The 3 classic themes (rendered with a color preview — no template page).
const LEGACY = [
  { id: 'classic', n: '13', name: 'Classique', desc: 'Mise en page classique et chaleureuse.' },
  { id: 'minimal', n: '14', name: 'Minimal', desc: 'Épuré, liste compacte par catégories.' },
  { id: 'dark', n: '15', name: 'Sombre', desc: 'Fond sombre, accents dorés.' },
] as const

interface MenuDesignPickerProps {
  businessId: string
  currentThemeId: string
  /** When set, previews render with this menu's real data (falls back to demo if empty). */
  slug?: string
  onSelect?: (id: string) => void
}

export default function MenuDesignPicker({ businessId, currentThemeId, slug, onSelect }: MenuDesignPickerProps) {
  const supabase = createClient()
  const q = slug ? `?slug=${encodeURIComponent(slug)}` : ''
  const [activeId, setActiveId] = useState(currentThemeId)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  async function selectDesign(id: string) {
    if (savingId || id === activeId) return

    const previous = activeId
    setActiveId(id) // optimistic
    setSavingId(id)
    setError(null)
    setSavedId(null)

    try {
      const { data, error: dbError } = await (supabase.from('businesses') as any)
        .update({ theme_id: id })
        .eq('id', businessId)
        .select('id, theme_id')

      if (dbError) throw new Error(dbError.message)
      if (!data || data.length === 0) {
        throw new Error("La modification n'a pas pu être enregistrée. Vérifiez vos accès.")
      }

      setSavedId(id)
      setTimeout(() => setSavedId((cur) => (cur === id ? null : cur)), 2500)
      onSelect?.(id)
    } catch (err: any) {
      setActiveId(previous)
      setError(err?.message || 'Une erreur est survenue.')
    } finally {
      setSavingId(null)
    }
  }

  function Card({
    id,
    name,
    desc,
    children,
    aperçuHref,
  }: {
    id: string
    name: string
    desc: string
    children: React.ReactNode
    aperçuHref?: string
  }) {
    const isActive = activeId === id
    const isSaving = savingId === id
    const isSaved = savedId === id

    return (
      <div
        className={`group relative overflow-hidden rounded-2xl border bg-white transition-all ${
          isActive ? 'border-orange-300 ring-2 ring-orange-200' : 'border-zinc-200 hover:border-zinc-300'
        }`}
      >
        <button
          type="button"
          onClick={() => selectDesign(id)}
          disabled={isSaving}
          aria-pressed={isActive}
          aria-label={`Choisir le design ${name}`}
          className="block w-full cursor-pointer text-left"
        >
          <div className="relative h-60 w-full overflow-hidden border-b border-zinc-100 bg-zinc-50">
            {children}
            {isActive && (
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                {isSaved ? 'Enregistré ✓' : 'Actif'}
              </span>
            )}
            {isSaving && (
              <span className="absolute inset-0 flex items-center justify-center bg-white/60">
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-300 border-t-orange-500" />
              </span>
            )}
          </div>
        </button>

        <div className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <h3 className="font-semibold text-zinc-900">{name}</h3>
            <p className="mt-1 text-sm text-zinc-500">{desc}</p>
          </div>
          {aperçuHref && (
            <a
              href={aperçuHref}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 whitespace-nowrap text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline"
            >
              Aperçu →
            </a>
          )}
        </div>

        <div className="border-t border-zinc-100 p-3">
          <button
            type="button"
            onClick={() => selectDesign(id)}
            disabled={isSaving || isActive}
            className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              isActive
                ? 'cursor-default bg-zinc-100 text-zinc-500'
                : 'bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60'
            }`}
          >
            {isActive ? 'Design actuel' : isSaving ? 'Application…' : 'Choisir ce design'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Modern design templates */}
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-400">Designs modernes</h2>
      <p className="mb-5 text-sm text-zinc-500">Modèles complets avec aperçu en direct.</p>
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        {DESIGNS.map((d) => (
          <Card key={d.id} id={d.id} name={d.name} desc={d.desc} aperçuHref={`/menu-designs/${d.n}${q}`}>
            <iframe
              src={`/menu-designs/${d.n}${q}`}
              title={`Aperçu ${d.name}`}
              aria-hidden="true"
              tabIndex={-1}
              scrolling="no"
              loading="lazy"
              className="pointer-events-none origin-top-left"
              style={{ width: '200%', height: '1100px', transform: 'scale(0.5)', border: 0 }}
            />
          </Card>
        ))}
      </div>

      {/* Classic themes */}
      <h2 className="mb-1 mt-10 text-sm font-semibold uppercase tracking-wide text-zinc-400">Thèmes classiques</h2>
      <p className="mb-5 text-sm text-zinc-500">Mises en page simples et éprouvées.</p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {LEGACY.map((t) => {
          const c = getTheme(t.id).colors
          return (
            <Card key={t.id} id={t.id} name={t.name} desc={t.desc} aperçuHref={`/menu-designs/${t.n}${q}`}>
              <div className="flex h-full w-full flex-col gap-3 p-5" style={{ backgroundColor: c.background }}>
                <div className="h-10 rounded-lg" style={{ backgroundColor: c.primary }} />
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg p-3"
                    style={{ backgroundColor: c.secondary, border: `1px solid ${c.border}` }}
                  >
                    <div className="space-y-1.5">
                      <div className="h-2 w-24 rounded" style={{ backgroundColor: c.text, opacity: 0.85 }} />
                      <div className="h-2 w-16 rounded" style={{ backgroundColor: c.muted || c.text, opacity: 0.4 }} />
                    </div>
                    <div
                      className="rounded px-2 py-1 text-xs font-bold text-white"
                      style={{ backgroundColor: c.primary }}
                    >
                      12 TND
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
