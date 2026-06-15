'use client'
// Design12 — "Terroir": a warm, artisanal serif menu (cream paper feel, a top
// brand strip, a horizontal category strip with circular photo/illustrated
// tiles, and balanced item cards with a circular photo or a tasteful line-art
// fallback). Driven by the SAME admin controls & brand colors as Design 1
// (orange→amber, overridable via the accent setting).

import { useMemo, useState } from 'react'
import MenuFooter from './MenuFooter'
import { getDesignSettings, resolveAccent, resolveGradient } from '@/lib/design-settings'
import { normalizeCats, searchItems, type KitItem, type KitCategory } from './kit'
import { InteractiveStyles, CenteredItemModal } from './interactive'
import { MenuDock } from './MenuDock'
import RouletteButton from './RouletteButton'
import { getSocials } from './SocialLinks'
import { FoodIcon } from './icons'

const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif"
const SANS = "'DM Sans', system-ui, -apple-system, sans-serif"
const PAGE = '#F6F1E9' // warm cream paper
const CARD = '#FFFDF9' // off-white card, a touch warmer than pure white
const INK = '#2A2118' // deep espresso brown, softer than black
const MUTED = '#8C8170'
const LINE = '#E7DECF' // hairline on cream

function fmt(p: number | null): string {
  return p == null || isNaN(Number(p)) ? '' : `${Number(p).toFixed(2)} TND`
}

/** Small social glyphs for the quiet footer row (own copy keeps this self-contained). */
function SocialGlyph({ icon }: { icon: ReturnType<typeof getSocials>[number]['icon'] }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'currentColor' as const }
  switch (icon) {
    case 'facebook':
      return <svg {...common}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
    case 'instagram':
      return <svg {...common}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
    case 'x':
      return <svg {...common}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
    case 'whatsapp':
      return <svg {...common}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
    default: // web
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" /></svg>
  }
}

export default function Design12({ business, categories }: { business: any; categories: any[] }) {
  const settings = getDesignSettings(business, 'design12')
  const accent = resolveAccent(settings, 'design12')
  const gradient = resolveGradient(settings, 'design12')
  const cats = useMemo(() => normalizeCats(categories, settings.showSoldOut), [categories, settings.showSoldOut])
  const [activeCat, setActiveCat] = useState<string | number>(cats[0]?.id ?? '')
  const [selected, setSelected] = useState<KitItem | null>(null)
  const [query, setQuery] = useState('')

  const totalItems = useMemo(() => cats.reduce((n, c) => n + c.items.length, 0), [cats])
  const socials = getSocials(business)

  const q = query.trim()
  // When searching: surface matching items across ALL categories.
  const searchResults: KitCategory[] = useMemo(
    () => (q ? cats.map((c) => ({ ...c, items: searchItems(c.items, q) })).filter((c) => c.items.length > 0) : []),
    [cats, q]
  )

  const active = cats.find((c) => c.id === activeCat) || cats[0]
  const items: KitItem[] = active?.items ?? []

  const toTop = () => typeof window !== 'undefined' && window.scrollTo({ top: 0, behavior: 'smooth' })

  // One shared item card — used for the active category AND search results.
  const ItemCard = ({ it, catName }: { it: KitItem; catName?: string }) => (
    <button
      type="button"
      onClick={() => setSelected(it)}
      className={`relative flex w-full items-center gap-4 overflow-hidden rounded-3xl p-3 pr-4 text-left ring-1 transition hover:-translate-y-0.5 active:scale-[0.99] ${it.available === false ? 'opacity-60' : ''}`}
      style={{ minHeight: 92, backgroundColor: CARD, boxShadow: '0 12px 30px -22px rgba(42,33,24,0.55)', ['--tw-ring-color' as string]: LINE }}
    >
      {/* Circular media: photo, else a warm line-art tile so every card is balanced. */}
      {it.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={it.image_url} alt="" className="h-[68px] w-[68px] shrink-0 rounded-full object-cover ring-1 ring-black/5 shadow-[0_6px_16px_-8px_rgba(42,33,24,0.6)]" style={{ outline: `3px solid ${CARD}`, outlineOffset: -3 }} />
      ) : (
        <span
          className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full ring-1 ring-black/5"
          style={{ backgroundColor: `${accent}14`, color: accent }}
          aria-hidden="true"
        >
          <FoodIcon hint={`${it.name} ${catName || active?.name || ''}`} className="h-7 w-7" strokeWidth={1.5} />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 truncate text-[18px] font-bold leading-snug" style={{ fontFamily: SERIF, color: INK }}>{it.name}</h3>
          {it.available === false && (
            <span className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ backgroundColor: '#EDE5D7', color: MUTED }}>Épuisé</span>
          )}
        </div>
        {settings.showDescriptions && it.description && (
          <p className="mt-0.5 line-clamp-1 text-[12.5px] leading-snug" style={{ color: MUTED }}>{it.description}</p>
        )}
        {settings.showPrices && it.price != null && (
          <p className="mt-1.5 text-[15px] font-extrabold tabular-nums" style={{ color: accent, fontFamily: SANS }}>{fmt(it.price)}</p>
        )}
      </div>
    </button>
  )

  return (
    <div className="mx-auto min-h-screen max-w-md pb-20 lg:max-w-4xl" style={{ backgroundColor: PAGE, color: INK, fontFamily: SANS }}>
      <InteractiveStyles />

      {/* ===== Top bar — slim brand accent strip ===== */}
      <div className="sticky top-0 z-30">
        <div style={{ backgroundImage: gradient, height: 5 }} />
        <header className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: PAGE, borderBottom: `1px solid ${LINE}` }}>
          {settings.showLogo && business?.logo_url ? (
            <button type="button" onClick={toTop} aria-label="Accueil" className="shrink-0 transition active:scale-95">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={business.logo_url} alt={business?.name || ''} className="h-10 w-auto max-w-[130px] object-contain" />
            </button>
          ) : (
            <button type="button" onClick={toTop} aria-label="Accueil" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition active:scale-95" style={{ backgroundImage: gradient, boxShadow: `0 8px 18px -8px ${accent}e6` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[19px] font-bold leading-tight" style={{ fontFamily: SERIF, color: INK }}>{business?.name || 'Notre Maison'}</p>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.28em]" style={{ color: accent }}>Notre carte</p>
          </div>
        </header>
      </div>

      {/* ===== Search + roulette entry ===== */}
      {/* pt-7 (not pt-4): leaves room for the roulette button's floating
          « Gagnez » caption so it sits in the gap below the sticky z-30 header
          instead of being painted over by it. */}
      {totalItems > 0 && (
        <div className="px-4 pt-7">
          <div className="flex items-stretch gap-2.5">
            <label className="flex flex-1 items-center gap-2.5 rounded-full px-4 ring-1 transition" style={{ backgroundColor: CARD, height: 46, ['--tw-ring-color' as string]: LINE }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un plat…"
                aria-label="Rechercher un plat"
                className="w-full bg-transparent text-base outline-none"
                style={{ color: INK }}
              />
              {q && (
                <button type="button" onClick={() => setQuery('')} aria-label="Effacer la recherche" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition active:scale-90" style={{ color: MUTED }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              )}
            </label>
            <RouletteButton
              slug={business?.slug}
              accent={accent}
              gradient={gradient}
              font={SANS}
              size={46}
              rounded="rounded-full"
            />
          </div>
        </div>
      )}

      {q ? (
        /* ===== Search results (across all categories) ===== */
        <section className="px-4 pt-6">
          {searchResults.length === 0 ? (
            <div className="rounded-3xl px-6 py-12 text-center ring-1" style={{ backgroundColor: CARD, ['--tw-ring-color' as string]: LINE }}>
              <p className="text-[15px] font-bold" style={{ fontFamily: SERIF, color: INK }}>Aucun plat trouvé</p>
              <p className="mt-1 text-[13px]" style={{ color: MUTED }}>Essayez un autre mot-clé.</p>
            </div>
          ) : (
            <div className="space-y-7">
              {searchResults.map((cat) => (
                <div key={cat.id}>
                  <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.18em]" style={{ color: MUTED }}>
                    <span className="inline-block h-1 w-5 rounded-full" style={{ backgroundImage: gradient }} />
                    {cat.name}
                  </h2>
                  <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-x-4 lg:gap-y-3 lg:space-y-0">
                    {cat.items.map((it) => <ItemCard key={it.id} it={it} catName={cat.name} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* ===== Catégories (horizontal photo strip) ===== */}
          <section className="pt-6">
            <div className="flex items-baseline justify-between px-4">
              <h2 className="text-[15px] font-bold uppercase tracking-[0.2em]" style={{ color: MUTED }}>Catégories</h2>
              {cats.length > 0 && <span className="text-[12px] font-semibold" style={{ color: MUTED }}>{cats.length}</span>}
            </div>

            {/* pt/pb give the active circle's outline + drop-shadow room — an
                overflow-x scroller also clips vertical overflow, which was
                slicing the top of the selected category circle. */}
            <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pt-2 pb-3">
              {cats.map((cat) => {
                const isActive = cat.id === active?.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCat(cat.id)}
                    className="group flex w-[78px] shrink-0 flex-col items-center gap-2 text-center transition active:scale-95"
                    aria-pressed={isActive}
                  >
                    <span
                      className="relative flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-full transition"
                      style={{
                        boxShadow: isActive ? `0 12px 26px -12px ${accent}a6` : '0 8px 22px -16px rgba(42,33,24,0.6)',
                        outline: isActive ? `2.5px solid ${accent}` : `2.5px solid transparent`,
                        outlineOffset: 2,
                      }}
                    >
                      {cat.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cat.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center" style={{ backgroundColor: `${accent}14`, color: accent }} aria-hidden="true">
                          <FoodIcon hint={cat.name} className="h-7 w-7" strokeWidth={1.5} />
                        </span>
                      )}
                      {!isActive && <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-black/10" />}
                    </span>
                    <span
                      className="block w-full truncate text-[12.5px] font-bold leading-tight"
                      style={{ fontFamily: SERIF, color: isActive ? INK : MUTED }}
                    >
                      {cat.name}
                    </span>
                  </button>
                )
              })}
              {cats.length === 0 && <p className="py-6 text-sm" style={{ color: MUTED }}>Le menu arrive bientôt.</p>}
            </div>
          </section>

          {/* ===== Items of active category ===== */}
          {items.length > 0 && (
            <section className="px-4 pt-7">
              <div className="flex items-center gap-3">
                <h2 className="text-[26px] font-bold leading-tight" style={{ fontFamily: SERIF, color: INK }}>{active?.name || 'Au menu'}</h2>
                <span className="h-px flex-1" style={{ backgroundColor: LINE }} />
                <span className="shrink-0 text-[12px] font-semibold" style={{ color: MUTED }}>{items.length} plat{items.length > 1 ? 's' : ''}</span>
              </div>

              <div className="mt-4 space-y-3 lg:grid lg:grid-cols-2 lg:gap-x-4 lg:gap-y-3 lg:space-y-0">
                {items.map((it) => <ItemCard key={it.id} it={it} />)}
              </div>
            </section>
          )}
        </>
      )}

      {/* ===== Quiet on-brand social row (only when the business has socials) ===== */}
      {socials.length > 0 && (
        <section className="mt-12 px-4">
          <div className="flex flex-col items-center gap-3 border-t pt-7" style={{ borderColor: LINE }}>
            <p className="text-[12px] font-bold uppercase tracking-[0.24em]" style={{ color: MUTED }}>Suivez-nous</p>
            <div className="flex items-center gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-black/5 transition hover:-translate-y-0.5 active:scale-95"
                  style={{ backgroundColor: CARD, color: INK, boxShadow: '0 8px 20px -14px rgba(42,33,24,0.6)' }}
                >
                  <SocialGlyph icon={s.icon} />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <MenuFooter business={business} settings={settings} accent={accent} />

      <CenteredItemModal item={selected} onClose={() => setSelected(null)} gradient={gradient} ink={INK} muted={MUTED} font={SANS} />
      <MenuDock business={business} categories={cats} accent={accent} gradient={gradient} font={SANS} includeSurprise={false} />
    </div>
  )
}
