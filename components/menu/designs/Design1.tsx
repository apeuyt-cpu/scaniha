'use client'

import { Fragment, useState } from 'react'
import Showcase from './Showcase'
import CoverBanner from './CoverBanner'
import MenuFooter from './MenuFooter'
import { getDesignSettings, resolveShowcaseItems, resolveAccent, resolveGradient, getExtra } from '@/lib/design-settings'
import { InteractiveStyles, CenteredItemModal } from './interactive'
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

const FONT = "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif"
const INK = '#15110C'
const MUTED = '#8C857A'
const PAGE = '#F6F4F0'
const HAIR = '#ECE7DF'

function priceParts(p: number | null) {
  if (p == null || isNaN(Number(p))) return { num: '—', ok: false }
  return { num: Number(p).toFixed(2), ok: true }
}

/**
 * Design1 — "Spécial du Jour": modern warm-minimal menu with motion.
 * Featured + mid-list sliders, an inline roulette entry button beside the search
 * bar (shown when a game is live), and a clean centered detail modal.
 */
export default function Design1({ business, categories }: { business: any; categories: any[] }) {
  const settings = getDesignSettings(business, 'design1')
  const accent = resolveAccent(settings, 'design1')
  const gradient = resolveGradient(settings, 'design1')
  const compact = getExtra<string>(settings, 'design1', 'density') === 'compact'

  const visibleCategories: Category[] = (Array.isArray(categories) ? categories : [])
    .filter((cat) => cat && cat.available !== false)
    .map((cat) => ({
      ...cat,
      items: (Array.isArray(cat.items) ? cat.items : []).filter(
        (item: Item) => item && (settings.showSoldOut || item.available !== false)
      ),
    }))
    .filter((cat) => cat.items.length > 0)

  const allItems: Item[] = visibleCategories.flatMap((cat) => cat.items)
  const availableItems = allItems.filter((it) => it.available !== false)
  const photoItems = availableItems.filter((it) => it.image_url)

  const [activeTab, setActiveTab] = useState<string | number | 'all'>('all')
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [query, setQuery] = useState('')

  const heroItems = resolveShowcaseItems(settings, photoItems, { count: 6 })
  const discoverItems = resolveShowcaseItems(settings, photoItems, { count: 6, seed: photoItems.length * 3 + 11 })

  const baseItems =
    activeTab === 'all' ? allItems : visibleCategories.find((cat) => cat.id === activeTab)?.items ?? []
  const q = query.trim().toLowerCase()
  const displayedItems = q
    ? baseItems.filter(
        (it) => it.name?.toLowerCase().includes(q) || (it.description ? it.description.toLowerCase().includes(q) : false)
      )
    : baseItems

  const slot = compact ? 52 : 60
  const initial = (business?.name || 'S').trim().charAt(0).toUpperCase()
  const fast = Math.max(1000, Math.min(settings.intervalMs, 2200))

  const showDiscover = !q && activeTab === 'all' && photoItems.length >= 2 && displayedItems.length >= 4 && settings.showcase
  const midIndex = showDiscover ? Math.floor(displayedItems.length / 2) - 1 : -1

  return (
    <div className="relative mx-auto min-h-screen max-w-md pb-12 lg:max-w-2xl" style={{ backgroundColor: PAGE, color: INK, fontFamily: FONT }}>
      <Animations />
      <InteractiveStyles />

      <CoverBanner src={settings.coverImage} />

      {/* ===== Header ===== */}
      <header className="px-6 pt-9">
        <div className="flex items-center gap-3">
          {settings.showLogo &&
            (business?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logo_url} alt={business?.name || ''} className="h-11 w-11 rounded-2xl object-cover ring-1 ring-black/5" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-base font-bold text-white" style={{ backgroundImage: gradient }}>
                {initial}
              </div>
            ))}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: MUTED }}>
              {settings.tagline || 'Notre carte'}
            </p>
            <h1 className="truncate text-[26px] font-bold leading-tight tracking-tight">{business?.name || 'Notre Restaurant'}</h1>
          </div>
        </div>

        {/* Search + roulette entry */}
        <div className="mt-5 flex items-stretch gap-2.5">
          <label className="flex flex-1 items-center gap-2.5 rounded-2xl bg-white px-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1" style={{ ['--tw-ring-color' as string]: HAIR, height: 48 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un plat…"
              className="w-full bg-transparent text-base outline-none placeholder:text-[#a8a097]"
            />
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
      </header>

      {/* ===== Featured hero slider ===== */}
      {settings.showcase && heroItems.length > 0 && !q && (
        <section className="d1-item d1-hero px-6 pt-7" style={{ animationDelay: '30ms' }}>
          <Showcase
            items={heroItems}
            pool={photoItems}
            randomize
            count={6}
            accent={accent}
            variant="card"
            autoSlide={settings.autoSlide}
            intervalMs={fast}
            transitionMs={260}
            showPrices={settings.showPrices}
            title={settings.title}
            subtitle={settings.subtitle}
            chipGradient={gradient}
            onSelect={(it) => setSelectedItem(it as Item)}
          />
        </section>
      )}

      {/* ===== Category pills (sticky) ===== */}
      {visibleCategories.length > 0 && (
        <nav className="sticky top-0 z-20 mt-7 px-6 py-3 backdrop-blur-md" style={{ backgroundColor: `${PAGE}e6` }}>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            <Pill label="Tout" active={activeTab === 'all'} onClick={() => setActiveTab('all')} gradient={gradient} accent={accent} />
            {visibleCategories.map((cat) => (
              <Pill key={cat.id} label={cat.name} active={activeTab === cat.id} onClick={() => setActiveTab(cat.id)} gradient={gradient} accent={accent} />
            ))}
          </div>
        </nav>
      )}

      {/* ===== Items ===== */}
      {/* min-height keeps short categories comfortably scrollable (hero can scroll away). */}
      <section className="min-h-[78vh] px-6 pt-3">
        {visibleCategories.length === 0 ? (
          <EmptyState gradient={gradient} />
        ) : displayedItems.length === 0 ? (
          <p className="py-14 text-center text-sm" style={{ color: MUTED }}>Aucun plat ne correspond à votre recherche.</p>
        ) : (
          <div className="space-y-2.5">
            {displayedItems.map((item, idx) => {
              const { num, ok } = priceParts(item.price)
              return (
                <Fragment key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className={`d1-item flex w-full items-center gap-3.5 rounded-[20px] bg-white p-2.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_30px_-22px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_18px_40px_-24px_rgba(0,0,0,0.45)] active:scale-[0.98] ${item.available === false ? 'opacity-60' : ''}`}
                    style={{ animationDelay: `${Math.min(idx * 32, 260)}ms` }}
                  >
                    {item.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt={item.name} className="flex-shrink-0 rounded-2xl object-cover" style={{ width: slot, height: slot }} />
                    )}

                    <div className="min-w-0 flex-1 py-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate text-[15px] font-semibold">{item.name}</h4>
                        {item.available === false && (
                          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ backgroundColor: HAIR, color: MUTED }}>Épuisé</span>
                        )}
                      </div>
                      {settings.showDescriptions && item.description && (
                        <p className="mt-0.5 line-clamp-1 text-[13px]" style={{ color: MUTED }}>{item.description}</p>
                      )}
                    </div>

                    {settings.showPrices && (
                      <div className="flex shrink-0 items-center gap-1.5 pr-1">
                        <span className="text-[15px] font-bold tabular-nums">
                          {num}
                          {ok && <span className="ml-0.5 text-[11px] font-semibold" style={{ color: MUTED }}>TND</span>}
                        </span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CDC6BB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </div>
                    )}
                  </button>

                  {idx === midIndex && (
                    <div className="py-3">
                      <Showcase
                        items={discoverItems}
                        pool={photoItems}
                        randomize
                        count={6}
                        accent={accent}
                        variant="card"
                        autoSlide={settings.autoSlide}
                        intervalMs={Math.max(2400, fast + 700)}
                        transitionMs={260}
                        showPrices={settings.showPrices}
                        title="À découvrir"
                        subtitle="Une sélection au hasard"
                        chipGradient={gradient}
                        onSelect={(it) => setSelectedItem(it as Item)}
                      />
                    </div>
                  )}
                </Fragment>
              )
            })}
          </div>
        )}
      </section>

      <CenteredItemModal item={selectedItem} onClose={() => setSelectedItem(null)} gradient={gradient} ink={INK} muted={MUTED} font={FONT} />
      <MenuFooter business={business} settings={settings} accent={accent} />
      <MenuDock business={business} categories={visibleCategories} accent={accent} gradient={gradient} font={FONT} includeSurprise={false} />
    </div>
  )
}

/* ---------- animations ---------- */

function Animations() {
  return (
    <style jsx global>{`
      @keyframes d1-in { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
      @keyframes d1-float { 0%,100% { transform: translateY(0) rotate(-9deg) } 50% { transform: translateY(-3px) rotate(9deg) } }
      @keyframes d1-shine { 0% { transform: translateX(-160%) } 55%,100% { transform: translateX(420%) } }
      @keyframes d1-kb { from { transform: scale(1.02) } to { transform: scale(1.12) } }
      .d1-item { opacity: 0; animation: d1-in .34s cubic-bezier(.22,1,.36,1) forwards }
      .d1-float { display: inline-block; animation: d1-float 1.8s ease-in-out infinite }
      .d1-shine { animation: d1-shine 2.6s ease-in-out infinite }
      .d1-hero img { animation: d1-kb 9s ease-in-out infinite alternate }
      @media (prefers-reduced-motion: reduce) {
        .d1-item,.d1-float,.d1-shine,.d1-hero img { animation: none !important; opacity: 1 !important; transform: none !important }
      }
    `}</style>
  )
}

/* ---------- sub-components ---------- */

function Pill({ label, active, onClick, gradient, accent }: { label: string; active: boolean; onClick: () => void; gradient: string; accent: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 whitespace-nowrap rounded-full px-4 text-[13.5px] font-semibold transition active:scale-95"
      style={
        active
          ? { backgroundImage: gradient, color: '#fff', height: 38, lineHeight: '38px', boxShadow: `0 6px 16px -8px ${accent}b3` }
          : { backgroundColor: '#fff', color: '#6B655C', height: 38, lineHeight: '36px', border: `1px solid ${HAIR}` }
      }
    >
      {label}
    </button>
  )
}

function EmptyState({ gradient }: { gradient: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl text-white" style={{ backgroundImage: gradient }}>
        <FoodIcon kind="utensils" className="h-8 w-8" strokeWidth={1.5} />
      </div>
      <h3 className="mt-5 text-base font-bold" style={{ color: INK }}>Menu en préparation</h3>
      <p className="mt-1.5 max-w-[16rem] text-sm" style={{ color: MUTED }}>
        Notre carte arrive très bientôt. Revenez dans un instant&nbsp;!
      </p>
    </div>
  )
}
