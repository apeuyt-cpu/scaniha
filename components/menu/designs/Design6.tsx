'use client'

import { useMemo, useState } from 'react'
import { type SheetItem } from './MenuSheets'
import { CenteredItemModal } from './interactive'
import Showcase from './Showcase'
import MenuFooter from './MenuFooter'
import { getSocials } from './SocialLinks'
import { getDesignSettings, resolveAccent, resolveGradient, resolveShowcaseItems, getExtra } from '@/lib/design-settings'
import { fmt, normalizeCats, searchItems, type KitItem } from './kit'
import { FoodIcon } from './icons'
import { MenuDock } from './MenuDock'
import RouletteButton from './RouletteButton'

const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif"
const SANS = 'system-ui, -apple-system, Segoe UI, sans-serif'
const INK = '#1A1A1A'
const MUTED = '#6B6B6B'
const FAINT = '#9A9186'
const PAGE = '#FFFDFB'
const DIVIDER = '#EBE4DA'
const TILE = '#F7F1E8'
const LEADER = '#D9CFBF'

/* Small editorial flourish used under the title and between footer blocks. */
function Flourish({ gradient }: { gradient: string }) {
  return (
    <div className="mx-auto mt-4 flex items-center justify-center gap-2" aria-hidden="true">
      <span className="h-px w-7" style={{ backgroundColor: LEADER }} />
      <span className="h-1.5 w-1.5 rotate-45 rounded-[1px]" style={{ backgroundImage: gradient }} />
      <span className="h-px w-7" style={{ backgroundColor: LEADER }} />
    </div>
  )
}

/* Understated social icon glyphs (line / fill) for the editorial footer row. */
function SocialGlyph({ icon }: { icon: 'facebook' | 'instagram' | 'x' | 'whatsapp' | 'web' }) {
  const common = { width: 17, height: 17, viewBox: '0 0 24 24', 'aria-hidden': true } as const
  switch (icon) {
    case 'instagram':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.6}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'facebook':
      return (
        <svg {...common} fill="currentColor">
          <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.9h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
        </svg>
      )
    case 'whatsapp':
      return (
        <svg {...common} fill="currentColor">
          <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57a1.1 1.1 0 0 0-.8.37c-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35Z" />
          <path d="M12.04 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.36 9.36 0 0 1-1.44-5 9.42 9.42 0 0 1 16.08-6.66 9.34 9.34 0 0 1 2.75 6.67 9.42 9.42 0 0 1-9.42 9.41Zm5.5-14.86A11.1 11.1 0 0 0 12.03 4 11.06 11.06 0 0 0 2.4 20.55L1 25l4.56-1.19a11.08 11.08 0 0 0 16.62-9.56 11 11 0 0 0-3.24-7.6Z" fill="none" stroke="currentColor" strokeWidth="0.4" />
        </svg>
      )
    case 'x':
      return (
        <svg {...common} fill="currentColor">
          <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z" />
        </svg>
      )
    default:
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.6}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.4 2.5 15.6 0 18M12 3c-2.5 2.4-2.5 15.6 0 18" />
        </svg>
      )
  }
}

/** Design6 — "Liste Élégante": an editorial serif carte with centred section
 * heads, refined dotted price leaders, brand orange used sparingly, and a
 * quiet engraved-style social row in the footer. */
export default function Design6({ business, categories }: { business: any; categories: any[] }) {
  const settings = getDesignSettings(business, 'design6')
  const accent = resolveAccent(settings, 'design6')
  const gradient = resolveGradient(settings, 'design6')
  const showThumbnails = getExtra<boolean>(settings, 'design6', 'showThumbnails')
  const cats = useMemo(() => normalizeCats(categories, settings.showSoldOut), [categories, settings.showSoldOut])
  const allItems = useMemo(() => cats.flatMap((c) => c.items), [cats])
  const available = allItems.filter((it) => it.available !== false)
  const socials = getSocials(business)
  const [selected, setSelected] = useState<SheetItem | null>(null)
  const [activeCat, setActiveCat] = useState<string | number>(cats[0]?.id ?? '')
  const [query, setQuery] = useState('')

  const q = query.trim()
  const shownCats = q
    ? cats.map((c) => ({ ...c, items: searchItems(c.items, q) })).filter((c) => c.items.length > 0)
    : cats

  const jump = (id: string | number) => {
    setActiveCat(id)
    if (typeof document !== 'undefined') document.getElementById(`d6-cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="mx-auto min-h-screen max-w-md pb-12 lg:max-w-4xl" style={{ backgroundColor: PAGE, color: INK, fontFamily: SERIF }}>
      {/* Header */}
      <header className="px-6 pt-12 text-center">
        {settings.showLogo && business?.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={business.logo_url} alt="" className="mx-auto mb-5 h-16 w-auto max-w-[170px] object-contain" />
        )}
        <p className="text-[10px] uppercase tracking-[0.45em]" style={{ color: FAINT, fontFamily: SANS }}>La Carte</p>
        <h1 className="mx-auto mt-3 max-w-[18ch] text-balance text-[32px] font-bold leading-[1.1] tracking-tight">{business?.name || 'Notre Maison'}</h1>
        {settings.tagline && (
          <p className="mx-auto mt-3 max-w-[34ch] text-[15px] italic leading-relaxed" style={{ color: MUTED }}>{settings.tagline}</p>
        )}
        <Flourish gradient={gradient} />
      </header>

      {/* Search + roulette entry */}
      {available.length > 0 && (
        <div className="px-6 pt-7 lg:px-12">
          <div className="mx-auto flex max-w-md items-stretch gap-2.5">
            <label className="flex flex-1 items-center gap-2.5 rounded-full border bg-white px-4 transition focus-within:border-transparent focus-within:ring-2" style={{ borderColor: DIVIDER, height: 48, ['--tw-ring-color' as any]: `${accent}55` }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={FAINT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un plat…" aria-label="Rechercher un plat" className="w-full bg-transparent text-base outline-none placeholder:text-[#A9A095]" style={{ color: INK, fontFamily: SANS }} />
              {q && (
                <button type="button" onClick={() => setQuery('')} aria-label="Effacer la recherche" className="shrink-0 text-[#B5ADA1] transition hover:text-[#7A7166]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              )}
            </label>
            <RouletteButton
              slug={business?.slug}
              accent={accent}
              gradient={gradient}
              font={SANS}
              size={48}
              rounded="rounded-full"
            />
          </div>
        </div>
      )}

      {/* Sticky category jump-bar */}
      {!q && cats.length > 1 && (
        <nav className="sticky top-0 z-20 mt-7 border-b backdrop-blur-md" style={{ backgroundColor: `${PAGE}f2`, borderColor: DIVIDER }}>
          <div className="no-scrollbar flex justify-start gap-6 overflow-x-auto px-6 py-3.5 lg:justify-center">
            {cats.map((cat) => {
              const active = activeCat === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => jump(cat.id)}
                  className="relative shrink-0 whitespace-nowrap pb-1 text-[12px] uppercase tracking-[0.16em] transition-colors"
                  style={{ color: active ? INK : MUTED, fontFamily: SANS, fontWeight: active ? 600 : 500 }}
                >
                  {cat.name}
                  {active && <span className="absolute -bottom-[1.5px] left-0 h-[2px] w-full rounded-full" style={{ backgroundImage: gradient }} />}
                </button>
              )
            })}
          </div>
        </nav>
      )}

      {/* Optional À la une strip */}
      {!q && settings.showcase && available.length > 0 && (
        <div className="px-6 pt-7 lg:px-12 [&_h2]:font-[inherit]">
          <Showcase
            items={resolveShowcaseItems(settings, available, { count: 6 })}
            pool={available}
            randomize={settings.source === 'random'}
            count={6}
            accent={accent}
            variant="banner"
            autoSlide={settings.autoSlide}
            intervalMs={settings.intervalMs}
            showPrices={settings.showPrices}
            title={settings.title}
            subtitle={settings.subtitle}
            chipGradient={gradient}
          />
        </div>
      )}

      {/* Sections */}
      <main className="px-6 pt-9 lg:px-12">
        {cats.length === 0 ? (
          <div className="py-20 text-center">
            <FoodIcon kind="utensils" className="mx-auto h-9 w-9" style={{ color: LEADER }} strokeWidth={1.3} />
            <p className="mt-4 text-[17px] italic" style={{ color: MUTED }}>Le menu arrive bientôt.</p>
          </div>
        ) : shownCats.length === 0 ? (
          <div className="py-20 text-center">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={LEADER} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="mx-auto" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <p className="mt-4 text-[17px] italic" style={{ color: MUTED }}>Aucun plat ne correspond à «&nbsp;{q}&nbsp;».</p>
            <button type="button" onClick={() => setQuery('')} className="mt-3 text-[13px] uppercase tracking-[0.12em] underline-offset-4 hover:underline" style={{ color: accent, fontFamily: SANS }}>Voir toute la carte</button>
          </div>
        ) : (
          <div className="space-y-12">
            {shownCats.map((cat) => (
              <section key={cat.id} id={`d6-cat-${cat.id}`} className="scroll-mt-24">
                {/* Section head */}
                <div className="text-center">
                  <h2 className="text-[20px] font-bold tracking-tight" style={{ color: INK }}>{cat.name}</h2>
                  <div className="mx-auto mt-2.5 flex items-center justify-center gap-2" aria-hidden="true">
                    <span className="h-px w-6" style={{ backgroundColor: LEADER }} />
                    <span className="h-[5px] w-[5px] rotate-45 rounded-[1px]" style={{ backgroundColor: accent }} />
                    <span className="h-px w-6" style={{ backgroundColor: LEADER }} />
                  </div>
                </div>

                <ul className="mt-6 lg:grid lg:grid-cols-2 lg:gap-x-10">
                  {cat.items.map((it: KitItem, i: number) => (
                    <li key={it.id} className="border-t first:border-t-0 lg:[&:nth-child(2)]:border-t-0" style={{ borderColor: DIVIDER }}>
                      <button
                        type="button"
                        onClick={() => setSelected(it)}
                        className={`group flex w-full items-start gap-3.5 py-4 text-left transition-opacity ${it.available === false ? 'opacity-50' : ''}`}
                        style={{ minHeight: showThumbnails ? 72 : undefined }}
                      >
                        {/* Fixed left slot — photo or cream tile + glyph (optional). */}
                        {showThumbnails && (
                          it.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.image_url} alt="" loading="lazy" decoding="async" className="mt-0.5 h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-black/[0.06]" />
                          ) : (
                            <span className="mt-0.5 flex h-14 w-14 shrink-0 items-center justify-center rounded-lg ring-1" style={{ backgroundColor: TILE, color: accent, borderColor: 'transparent', ['--tw-ring-color' as any]: `${accent}22` }} aria-hidden="true">
                              <FoodIcon hint={`${it.name} ${cat.name}`} className="h-[26px] w-[26px]" strokeWidth={1.4} />
                            </span>
                          )
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className={`text-[17px] font-semibold leading-snug ${it.available === false ? 'line-through' : ''}`}>{it.name}</span>
                            <span className="mx-0.5 mb-[3px] min-w-[1.5rem] flex-1 self-end border-b border-dotted" style={{ borderColor: LEADER }} aria-hidden="true" />
                            {settings.showPrices && (
                              <span className="shrink-0 text-[16px] font-bold tabular-nums" style={{ color: accent, fontFamily: SANS }}>{fmt(it.price)}</span>
                            )}
                          </div>
                          {it.available === false && (
                            <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ backgroundColor: '#F2ECE2', color: FAINT, fontFamily: SANS }}>Épuisé</span>
                          )}
                          {settings.showDescriptions && it.description && (
                            <p className="mt-1.5 text-[13px] italic leading-relaxed" style={{ color: MUTED }}>{it.description}</p>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Quiet editorial social row — only when the business has socials. */}
      {socials.length > 0 && (
        <div className="mt-14 px-6 text-center lg:px-12">
          <div className="mx-auto flex max-w-md items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1" style={{ backgroundColor: DIVIDER }} />
            <span className="text-[10px] uppercase tracking-[0.35em]" style={{ color: FAINT, fontFamily: SANS }}>Suivez-nous</span>
            <span className="h-px flex-1" style={{ backgroundColor: DIVIDER }} />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                title={s.label}
                className="flex h-11 w-11 items-center justify-center rounded-full border bg-white transition hover:-translate-y-0.5"
                style={{ borderColor: DIVIDER, color: '#5C534A' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = accent; e.currentTarget.style.borderColor = `${accent}66` }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#5C534A'; e.currentTarget.style.borderColor = DIVIDER }}
              >
                <SocialGlyph icon={s.icon} />
              </a>
            ))}
          </div>
        </div>
      )}

      <MenuFooter business={business} settings={settings} accent={accent} />

      {/* Closing mark when there's no contact footer to anchor the page. */}
      {!settings.contactEnabled && business?.name && (
        <p className="mt-12 text-center text-[11px] uppercase tracking-[0.3em]" style={{ color: FAINT, fontFamily: SANS }}>· {business.name} ·</p>
      )}

      <CenteredItemModal item={selected} onClose={() => setSelected(null)} gradient={gradient} ink={INK} muted={MUTED} font={SERIF} />
      <MenuDock business={business} categories={cats} accent={accent} gradient={gradient} includeSurprise={false} />
    </div>
  )
}
