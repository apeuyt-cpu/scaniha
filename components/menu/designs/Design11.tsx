'use client'
// Design11 — "Vitrine Immersive" (premium cover-hero template).

import { useEffect, useMemo, useRef, useState } from 'react'
import MenuFooter from './MenuFooter'
import { getDesignSettings, resolveAccent, resolveGradient, resolveShowcaseItems, getExtra } from '@/lib/design-settings'
import { normalizeCats, type KitItem } from './kit'
import { FoodIcon } from './icons'
import { InteractiveStyles, CenteredItemModal } from './interactive'
import { getSocials } from './SocialLinks'
import { MenuDock } from './MenuDock'
import RouletteButton from './RouletteButton'
import AddToCart from '@/components/order/AddToCart'

const FONT = "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif"
const INK = '#171210'
const MUTED = '#857C72'
const PAGE = '#FBF8F4'
const HAIR = '#ECE5DC'
const TILE = '#F5EEE5'

function priceParts(p: number | null) {
  if (p == null || isNaN(Number(p))) return { num: '—', ok: false }
  return { num: Number(p).toFixed(2), ok: true }
}

/** Small circular brand glyph used as the no-photo fallback (on-brand tinted tile). */
function NoPhoto({ hint, accent, className }: { hint: string; accent: string; className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${className ?? ''}`}
      style={{ backgroundColor: TILE, color: `${accent}CC` }}
      aria-hidden="true"
    >
      <FoodIcon hint={hint} className="h-1/2 w-1/2" strokeWidth={1.5} />
    </span>
  )
}

/**
 * Design11 — "Vitrine Immersive": premium full-screen cover hero, frosted-glass
 * category nav, large grouped cards, refined motion, plus an inline roulette
 * entry button beside the search (when a game is live) and a centered detail modal.
 */
export default function Design11({ business, categories, ordering = false }: { business: any; categories: any[]; ordering?: boolean }) {
  const settings = getDesignSettings(business, 'design11')
  const accent = resolveAccent(settings, 'design11')
  const gradient = resolveGradient(settings, 'design11')
  const cats = useMemo(() => normalizeCats(categories, settings.showSoldOut), [categories, settings.showSoldOut])
  const allItems = useMemo(() => cats.flatMap((c) => c.items), [cats])
  const available = useMemo(() => allItems.filter((it) => it.available !== false), [allItems])
  const photoItems = useMemo(() => available.filter((it) => it.image_url), [available])
  const socials = useMemo(() => getSocials(business), [business])

  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState<string | number>(cats[0]?.id ?? '')
  const [selected, setSelected] = useState<KitItem | null>(null)
  const navRef = useRef<HTMLElement | null>(null)
  // Suppress scroll-spy briefly while a tap-driven smooth scroll is in flight.
  const lockSpy = useRef(false)

  const cover = settings.coverImage || photoItems[0]?.image_url || null

  const q = query.trim().toLowerCase()
  const groups = cats
    .map((c) => ({
      ...c,
      items: q
        ? c.items.filter((it: KitItem) => it.name?.toLowerCase().includes(q) || (it.description ? it.description.toLowerCase().includes(q) : false))
        : c.items,
    }))
    .filter((c) => c.items.length > 0)
  const resultCount = groups.reduce((n, c) => n + c.items.length, 0)

  const jump = (id: string | number) => {
    setActiveCat(id)
    lockSpy.current = true
    setTimeout(() => (lockSpy.current = false), 700)
    if (typeof document !== 'undefined') document.getElementById(`d11-cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Keep the active chip in sync as the diner scrolls (scroll-spy).
  useEffect(() => {
    if (q || cats.length <= 1 || typeof IntersectionObserver === 'undefined') return
    const sections = cats
      .map((c) => document.getElementById(`d11-cat-${c.id}`))
      .filter((el): el is HTMLElement => !!el)
    if (sections.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (lockSpy.current) return
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActiveCat(visible.target.id.replace('d11-cat-', ''))
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [q, cats])

  // Auto-scroll the active chip into view within the horizontal nav.
  useEffect(() => {
    const el = navRef.current?.querySelector<HTMLElement>(`[data-cat="${activeCat}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeCat])

  return (
    <div className="mx-auto min-h-screen max-w-md pb-12 lg:max-w-4xl" style={{ backgroundColor: PAGE, color: INK, fontFamily: FONT }}>
      <InteractiveStyles />
      <style jsx global>{`
        @keyframes d11-rise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes d11-kenburns { from { transform: scale(1.05) } to { transform: scale(1.12) } }
        .d11-rise { opacity: 0; animation: d11-rise .5s cubic-bezier(.22,1,.36,1) forwards }
        .d11-kb { animation: d11-kenburns 22s ease-in-out infinite alternate }
        @media (prefers-reduced-motion: reduce) {
          .d11-rise,.d11-kb { animation: none !important; opacity: 1 !important; transform: none !important }
        }
      `}</style>

      {/* ===== Cover hero ===== */}
      <header className="relative h-[286px] w-full overflow-hidden lg:h-[348px]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" aria-hidden="true" className="d11-kb absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ backgroundImage: gradient }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.12) 52%, rgba(0,0,0,0.30) 100%)' }} />

        <div className="absolute inset-x-0 bottom-0 px-6 pb-9">
          <div className="d11-rise flex items-center gap-3.5" style={{ animationDelay: '60ms' }}>
            {settings.showLogo && business?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logo_url} alt="" className="h-14 w-14 rounded-2xl bg-white/90 object-contain p-1.5 shadow-lg ring-2 ring-white/40" />
            )}
            <div className="min-w-0">
              {settings.tagline ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80">{settings.tagline}</p>
              ) : (
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/75">Menu</p>
              )}
              <h1 className="truncate text-[30px] font-extrabold leading-[1.1] tracking-tight text-white drop-shadow-sm">{business?.name || 'Notre Maison'}</h1>
            </div>
          </div>
          {available.length > 0 && (
            <div className="d11-rise mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-semibold text-white/85" style={{ animationDelay: '140ms' }}>
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundImage: gradient }} />
                {available.length} plat{available.length > 1 ? 's' : ''}
              </span>
              {cats.length > 1 && (
                <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-sm">
                  {cats.length} catégories
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ===== Frosted sticky bar: search + categories ===== */}
      <div className="sticky top-0 z-30 -mt-6 rounded-t-[28px] border-t border-white/50 bg-white/85 px-5 pb-3 pt-4 shadow-[0_-10px_34px_-22px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <span className="mx-auto mb-3.5 block h-1 w-10 rounded-full" style={{ backgroundColor: HAIR }} aria-hidden="true" />

        <div className="flex items-stretch gap-2.5">
          <label className="flex flex-1 items-center gap-2.5 rounded-2xl px-4 transition-shadow focus-within:shadow-[0_0_0_2px_var(--d11-focus)]" style={{ backgroundColor: PAGE, border: `1px solid ${HAIR}`, height: 48, ['--d11-focus' as any]: `${accent}40` }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un plat…"
              aria-label="Rechercher un plat"
              className="w-full bg-transparent text-base outline-none placeholder:text-[#A89E92]"
              style={{ color: INK }}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Effacer la recherche" className="-m-1.5 flex shrink-0 items-center justify-center p-1.5 transition active:scale-90">
                <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: HAIR, color: MUTED }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </span>
              </button>
            )}
          </label>
          <RouletteButton
            slug={business?.slug}
            accent={accent}
            gradient={gradient}
            font={FONT}
            size={48}
            rounded="rounded-2xl"
          />
        </div>

        {!q && cats.length > 1 && (
          <nav ref={navRef} aria-label="Catégories" className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
            {cats.map((cat) => {
              const active = activeCat === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  data-cat={cat.id}
                  onClick={() => jump(cat.id)}
                  className="flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-[13.5px] font-semibold transition active:scale-95"
                  style={active
                    ? { backgroundImage: gradient, color: '#fff', boxShadow: `0 6px 16px -8px ${accent}b3` }
                    : { backgroundColor: PAGE, color: '#6B6259', border: `1px solid ${HAIR}` }}
                >
                  {cat.name}
                </button>
              )
            })}
          </nav>
        )}

        {q && (
          <p className="mt-3 px-1 text-[12.5px] font-semibold" style={{ color: MUTED }}>
            {resultCount > 0 ? `${resultCount} résultat${resultCount > 1 ? 's' : ''}` : 'Aucun résultat'}
          </p>
        )}
      </div>

      {/* ===== Featured strip ===== */}
      {settings.showcase && photoItems.length > 1 && !q && (
        <section className="px-5 pt-6">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-[18px] font-extrabold tracking-tight">{settings.title || 'À la une'}</h2>
            {settings.subtitle && <p className="truncate text-[12.5px] font-medium" style={{ color: MUTED }}>{settings.subtitle}</p>}
          </div>
          <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-5 pb-1">
            {resolveShowcaseItems(settings, photoItems, { count: 6 }).map((it: KitItem) => {
              const { num, ok } = priceParts(it.price)
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setSelected(it)}
                  className="relative h-44 w-[74%] shrink-0 snap-start overflow-hidden rounded-[24px] text-left ring-1 ring-black/5 shadow-[0_18px_44px_-26px_rgba(0,0,0,0.55)] transition active:scale-[0.98] lg:w-[44%]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.image_url as string} alt={it.name} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4">
                    <h3 className="text-[16px] font-bold leading-tight text-white drop-shadow">{it.name}</h3>
                    {settings.showPrices && ok && (
                      <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-white shadow-sm" style={{ backgroundImage: gradient }}>{num} TND</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* ===== Grouped item cards ===== */}
      <main className="px-5 pt-7">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: TILE, color: `${accent}B3` }}>
              <FoodIcon kind="utensils" className="h-7 w-7" strokeWidth={1.5} />
            </span>
            <p className="text-[15px] font-bold" style={{ color: INK }}>{q ? 'Aucun plat trouvé' : 'Le menu arrive bientôt'}</p>
            {q && (
              <button type="button" onClick={() => setQuery('')} className="rounded-full px-4 py-2 text-[13px] font-bold text-white transition active:scale-95" style={{ backgroundImage: gradient }}>
                Réinitialiser
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-9">
            {groups.map((cat) => (
              <section key={cat.id} id={`d11-cat-${cat.id}`} className="scroll-mt-36">
                <div className="mb-3.5 flex items-baseline gap-2.5">
                  <h2 className="text-[20px] font-extrabold tracking-tight">{cat.name}</h2>
                  <span className="text-[12.5px] font-semibold" style={{ color: MUTED }}>{cat.items.length}</span>
                </div>
                <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-x-4 lg:gap-y-2.5 lg:space-y-0">
                  {cat.items.map((it: KitItem, i: number) => {
                    const { num, ok } = priceParts(it.price)
                    const soldOut = it.available === false
                    return (
                      <div
                        key={it.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelected(it)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(it) } }}
                        className={`d11-rise flex w-full cursor-pointer items-center gap-3.5 rounded-[22px] bg-white p-3 text-left ring-1 ring-black/[0.04] shadow-[0_1px_2px_rgba(0,0,0,0.03),0_14px_36px_-28px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 active:scale-[0.99] ${soldOut ? 'opacity-60' : ''}`}
                        style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className={`truncate text-[16px] font-bold ${soldOut ? 'line-through' : ''}`}>{it.name}</h3>
                            {soldOut && (
                              <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ backgroundColor: HAIR, color: '#5F574E' }}>Épuisé</span>
                            )}
                          </div>
                          {settings.showDescriptions && it.description && (
                            <p className="mt-1 line-clamp-2 text-[13px] leading-snug" style={{ color: MUTED }}>{it.description}</p>
                          )}
                          {settings.showPrices && (
                            <p className="mt-2 text-[15.5px] font-extrabold tabular-nums" style={{ color: ok ? INK : MUTED }}>
                              {num}
                              {ok && <span className="ml-1 text-[11px] font-bold" style={{ color: MUTED }}>TND</span>}
                            </p>
                          )}
                          {ordering && (
                            <div className="mt-2">
                              <AddToCart item={{ id: String(it.id), name: it.name, price: it.price, available: it.available }} accent={accent} size="sm" />
                            </div>
                          )}
                        </div>
                        {it.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.image_url} alt="" loading="lazy" decoding="async" className="h-[86px] w-[86px] shrink-0 rounded-2xl object-cover ring-1 ring-black/5" />
                        ) : (
                          <NoPhoto hint={`${it.name} ${cat.name}`} accent={accent} className="h-[86px] w-[86px] rounded-2xl ring-1 ring-black/5" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <MenuFooter business={business} settings={settings} accent={accent} />

      {/* ===== Quiet social row (owner explicitly wants social visible) ===== */}
      {socials.length > 0 && (
        <div className={`px-5 ${settings.contactEnabled ? '-mt-2' : 'mt-12 border-t border-black/[0.06] pt-8'} pb-6`}>
          <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: MUTED }}>Suivez-nous</p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                title={s.label}
                className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-[0_8px_20px_-10px_rgba(0,0,0,0.5)] ring-1 ring-black/5 transition hover:-translate-y-0.5 active:scale-90"
                style={{ backgroundColor: s.color }}
              >
                <SocialGlyph icon={s.icon} />
              </a>
            ))}
          </div>
          {!settings.contactEnabled && business?.name && (
            <p className="mt-6 text-center text-[11px]" style={{ color: '#B5ABA0' }}>© {business.name}</p>
          )}
        </div>
      )}

      <CenteredItemModal item={selected} onClose={() => setSelected(null)} gradient={gradient} ink={INK} muted={MUTED} font={FONT} />
      <MenuDock business={business} categories={cats} accent={accent} gradient={gradient} font={FONT} includeSurprise={false} />
    </div>
  )
}

/** Small social glyphs (Instagram / Facebook / WhatsApp / X / Site web) for the footer row. */
function SocialGlyph({ icon }: { icon: 'facebook' | 'instagram' | 'x' | 'whatsapp' | 'web' | 'google' }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'currentColor' as const, 'aria-hidden': true as const }
  switch (icon) {
    case 'google':
      return <svg {...common}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" /></svg>
    case 'facebook':
      return <svg {...common}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
    case 'instagram':
      return <svg {...common}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
    case 'x':
      return <svg {...common}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
    case 'whatsapp':
      return <svg {...common}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
    default:
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
  }
}
