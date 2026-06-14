'use client'

import { useMemo, useState } from 'react'
import { CenteredItemModal } from './interactive'
import MenuFooter from './MenuFooter'
import { getDesignSettings, resolveAccent, resolveGradient } from '@/lib/design-settings'
import { MenuDock } from './MenuDock'
import RouletteButton from './RouletteButton'
import { FoodIcon } from './icons'

type Item = {
  id: string | number
  name: string
  description: string | null
  price: number | null
  image_url: string | null
  available: boolean
}

type Category = {
  id: string | number
  name: string
  image_url: string | null
  available: boolean
  items: Item[]
}

const formatPrice = (price: number | null) =>
  price == null ? null : `${Number(price).toFixed(2)} TND`

// On-brand no-photo placeholder: a soft tint of the owner's ACCENT + a line food
// glyph (no off-brand rainbow tiles, no emoji). Derived from accent so it tracks
// the chosen brand colour instead of always being orange.
const brandTint = (accent: string) => `linear-gradient(135deg, ${accent}1F, ${accent}3D)`

export default function Design2({
  business,
  categories,
}: {
  business: any
  categories: any[]
}) {
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState<string | number | 'all'>('all')
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

  const settings = getDesignSettings(business, 'design2')
  const accent = resolveAccent(settings, 'design2')
  const gradient = resolveGradient(settings, 'design2')
  const soldOut = settings.showSoldOut

  // Visible categories: available; items kept depend on the "sold out" setting.
  const visibleCategories: Category[] = useMemo(() => {
    return (categories || [])
      .filter(
        (cat) =>
          cat &&
          cat.available !== false &&
          Array.isArray(cat.items) &&
          cat.items.some((it: Item) => it && (soldOut || it.available !== false))
      )
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((it: Item) => it && (soldOut || it.available !== false)),
      }))
  }, [categories, soldOut])

  const allItems: Item[] = useMemo(
    () => visibleCategories.flatMap((cat) => cat.items),
    [visibleCategories]
  )
  const availableItems = useMemo(() => allItems.filter((it) => it.available !== false), [allItems])

  const filteredItems = useMemo(() => {
    const base =
      activeCat === 'all'
        ? allItems
        : visibleCategories.find((c) => String(c.id) === String(activeCat))?.items ?? []
    const q = query.trim().toLowerCase()
    if (!q) return base
    return base.filter(
      (it) =>
        it.name?.toLowerCase().includes(q) ||
        (it.description ? it.description.toLowerCase().includes(q) : false)
    )
  }, [allItems, visibleCategories, activeCat, query])

  const heroImage = availableItems.find((it) => it.image_url)?.image_url || null

  const listItems = filteredItems
  const cover = settings.coverImage || heroImage

  const heading = business?.name || 'Notre Restaurant'

  return (
    <div className="mx-auto min-h-screen max-w-md bg-white text-slate-900 antialiased lg:max-w-4xl">
      <div
        className="px-4 pb-10 pt-4"
        style={{ fontFamily: "'Cairo', system-ui, -apple-system, sans-serif" }}
      >
        {/* ===== DARK HERO CARD ===== */}
        <section
          className="relative overflow-hidden rounded-[2rem] p-5 pb-6 text-white shadow-xl"
          style={{
            backgroundImage: cover
              ? `linear-gradient(160deg, rgba(15,23,42,0.78) 0%, rgba(15,23,42,0.92) 70%, rgba(2,6,23,0.97) 100%), url(${cover})`
              : 'linear-gradient(160deg, #1e293b 0%, #0f172a 60%, #020617 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Top bar: logo */}
          {settings.showLogo && (
            <div className="flex justify-center">
              {business?.logo_url ? (
                <img
                  src={business.logo_url}
                  alt={heading}
                  className="h-10 w-auto max-w-[140px] object-contain"
                />
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-lg font-bold text-white ring-1 ring-white/25">
                  {(business?.name || 'S').trim().charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          )}

          {/* Heading + subtitle */}
          <div className="mt-8">
            <h1 className="text-3xl font-bold leading-tight tracking-tight">
              {heading}
            </h1>
            {settings.tagline && (
              <p className="mt-2 max-w-[18rem] text-sm leading-relaxed text-white/70">
                {settings.tagline}
              </p>
            )}
          </div>

          {/* Search bar + roulette entry */}
          <div className="mt-6 flex items-stretch gap-2.5">
            <div className="flex flex-1 items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm ring-1 ring-white/10 focus-within:ring-white/30">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-shrink-0 text-white/70"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher des plats..."
                className="w-full bg-transparent text-base text-white placeholder-white/50 outline-none"
              />
            </div>
            <RouletteButton
              slug={business?.slug}
              accent={accent}
              gradient={gradient}
              font="'Cairo', system-ui, -apple-system, sans-serif"
              size={50}
              rounded="rounded-2xl"
            />
          </div>
        </section>

        {/* ===== CATEGORY SLIDER (images) ===== */}
        {visibleCategories.length > 0 && (
          <section className="mt-6 -mx-4">
            {/* pt/pb so the active tile's ring (ring-offset-2) isn't clipped —
                an overflow-x scroller also clips vertical overflow. */}
            <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pt-2 pb-2">
              {/* "Tout" tile */}
              <button
                type="button"
                onClick={() => setActiveCat('all')}
                className={`relative h-[120px] w-[104px] flex-shrink-0 overflow-hidden rounded-2xl text-left transition ${
                  activeCat === 'all' ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{ background: gradient, ...(activeCat === 'all' ? { ['--tw-ring-color' as string]: accent } : {}) }}
              >
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
                  <span className="text-sm font-bold">Tout</span>
                </span>
              </button>

              {visibleCategories.map((cat) => {
                const active = String(activeCat) === String(cat.id)
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCat(cat.id)}
                    className={`relative h-[120px] w-[104px] flex-shrink-0 overflow-hidden rounded-2xl text-left transition ${
                      active ? 'ring-2 ring-offset-2' : ''
                    }`}
                    style={active ? { ['--tw-ring-color' as string]: accent } : undefined}
                  >
                    {cat.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cat.image_url} alt={cat.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center" style={{ background: brandTint(accent) }} aria-hidden="true">
                        <FoodIcon hint={cat.name} className="h-10 w-10" style={{ color: `${accent}B3` }} strokeWidth={1.4} />
                      </span>
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 p-2.5 text-sm font-bold leading-tight text-white drop-shadow">
                      {cat.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* ===== EMPTY STATE ===== */}
        {allItems.length === 0 ? (
          <div className="mt-16 flex flex-col items-center px-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background: brandTint(accent) }}>
              <FoodIcon kind="utensils" className="h-9 w-9" style={{ color: `${accent}B3` }} strokeWidth={1.4} />
            </div>
            <h2 className="mt-5 text-lg font-bold text-slate-800">
              Le menu arrive bientôt
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Notre chef prépare de délicieuses surprises. Revenez très vite !
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="mt-16 flex flex-col items-center px-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background: brandTint(accent) }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={`${accent}B3`} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <h2 className="mt-5 text-lg font-bold text-slate-800">
              Aucun plat trouvé
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Essayez un autre mot-clé pour trouver votre plat préféré.
            </p>
          </div>
        ) : (
          <>
            {/* ===== Menu list ===== */}
            {listItems.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-bold text-slate-900">
                  {activeCat === 'all'
                    ? 'Notre menu'
                    : visibleCategories.find((c) => String(c.id) === String(activeCat))?.name || 'Notre menu'}
                </h2>

                <ul className="mt-4 space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                  {listItems.map((item, i) => (
                    <li key={item.id}>
                      <article
                        onClick={() => setSelectedItem(item)}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-slate-100 transition-colors ${item.available === false ? 'opacity-60' : ''}`}
                        onMouseEnter={(e) => { e.currentTarget.style.setProperty('--tw-ring-color', `${accent}66`) }}
                        onMouseLeave={(e) => { e.currentTarget.style.removeProperty('--tw-ring-color') }}
                      >
                        {item.image_url && (
                          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-slate-800">{item.name}</h3>
                            {item.available === false && (
                              <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">Épuisé</span>
                            )}
                          </div>
                          {settings.showDescriptions && item.description ? (
                            <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                              {item.description}
                            </p>
                          ) : null}
                          {settings.showPrices && (
                            <span className="mt-1 block text-sm font-bold" style={{ color: accent }}>
                              {formatPrice(item.price) ?? '—'}
                            </span>
                          )}
                        </div>
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white shadow-sm"
                          style={{ backgroundImage: gradient }}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </span>
                      </article>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      <MenuFooter business={business} settings={settings} accent={accent} />

      <CenteredItemModal item={selectedItem} onClose={() => setSelectedItem(null)} gradient={gradient} font="'Cairo', system-ui, -apple-system, sans-serif" />
      <MenuDock business={business} categories={visibleCategories} accent={accent} gradient={gradient} includeSurprise={false} />
    </div>
  )
}
