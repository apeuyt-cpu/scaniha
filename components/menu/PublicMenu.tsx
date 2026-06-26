'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import DynamicFavicon from '@/components/admin/DynamicFavicon'
import type { Database } from '@/lib/supabase/database.types'
import type { Theme } from '@/lib/themes'
// Code-split each menu design into its own chunk so a diner only downloads the
// one design that actually renders (ssr stays default true → SSR HTML unchanged).
const Design1 = dynamic(() => import('@/components/menu/designs/Design1'))
const Design2 = dynamic(() => import('@/components/menu/designs/Design2'))
const Design6 = dynamic(() => import('@/components/menu/designs/Design6'))
const Design11 = dynamic(() => import('@/components/menu/designs/Design11'))
const Design12 = dynamic(() => import('@/components/menu/designs/Design12'))
import { MenuDock } from '@/components/menu/designs/MenuDock'
import RouletteButton from '@/components/menu/designs/RouletteButton'
import { FoodIcon } from '@/components/menu/designs/icons'
import AddToCart from '@/components/order/AddToCart'

type Business = Database['public']['Tables']['businesses']['Row']
type Item = Database['public']['Tables']['items']['Row']
type Category = Database['public']['Tables']['categories']['Row'] & {
  items: Item[]
}

interface PublicMenuProps {
  business: Business
  categories: Category[]
  theme: Theme
  /** When true, each item shows an inline add-to-cart control (table ordering). */
  ordering?: boolean
}

export default function PublicMenu({ business, categories, theme, ordering = false }: PublicMenuProps) {
  const isPaused = business.status === 'paused'
  const [activeCategory, setActiveCategory] = useState<string | null>(
    categories.length > 0 ? categories[0].id : null
  )
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  
  const isDark = theme.id === 'dark'
  const isMinimal = theme.id === 'minimal'

  // Memoize so the array identity is stable across renders — otherwise the
  // scroll-spy effect below re-subscribes its listener on every single render.
  const visibleCategories = useMemo(
    () =>
      categories.filter(cat => {
        // Filter out hidden categories
        if (cat.available === false) return false
        // Only show categories with at least one available item
        return cat.items.some(item => item.available)
      }),
    [categories]
  )
  const totalVisibleItems = visibleCategories.reduce(
    (acc, category) => acc + category.items.filter((item) => item.available).length,
    0
  )
  const heroImageUrl =
    visibleCategories.find((category) => category.image_url)?.image_url ||
    visibleCategories.flatMap((category) => category.items).find((item) => item.available && item.image_url)?.image_url ||
    null

  // Track scroll to update active category
  useEffect(() => {
    if (isMinimal) return
    
    const handleScroll = () => {
      const sections = visibleCategories.map(cat => ({
        id: cat.id,
        el: document.getElementById(`cat-${cat.id}`)
      }))
      
      const scrollPos = window.scrollY + 150

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i]
        if (section.el && section.el.offsetTop <= scrollPos) {
          setActiveCategory(section.id)
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [visibleCategories, isMinimal])

  // New menu design templates
  if (theme.id === 'design1') return <Design1 business={business} categories={visibleCategories} ordering={ordering} />
  if (theme.id === 'design2') return <Design2 business={business} categories={visibleCategories} ordering={ordering} />
  if (theme.id === 'design6') return <Design6 business={business} categories={visibleCategories} ordering={ordering} />
  if (theme.id === 'design11') return <Design11 business={business} categories={visibleCategories} ordering={ordering} />
  if (theme.id === 'design12') return <Design12 business={business} categories={visibleCategories} ordering={ordering} />

  // Minimal theme - unique layout
  if (isMinimal) {
    return <MinimalLayout
      business={business}
      categories={visibleCategories}
      theme={theme}
      isPaused={isPaused}
      ordering={ordering}
      activeCategory={activeCategory}
      setActiveCategory={setActiveCategory}
      expandedItem={expandedItem}
      setExpandedItem={setExpandedItem}
    />
  }

  // Default layout (Classic & Dark themes)
  return (
    <>
      <DynamicFavicon logoUrl={business.logo_url} businessName={business.name} />
      <style jsx>{`
        .menu-container {
          scroll-behavior: smooth;
        }
        
        .menu-surface {
          background:
            linear-gradient(180deg, ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.72)'} 0%, transparent 34rem),
            ${theme.colors.background};
        }

        .hero-shell {
          isolation: isolate;
        }

        .hero-media {
          box-shadow: ${isDark ? `0 24px 70px -32px ${theme.colors.primary}80` : '0 24px 70px -42px rgba(44,44,44,0.38)'};
        }

        .menu-item {
          position: relative;
          transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, background-color 0.22s ease;
          box-shadow: ${isDark ? '0 18px 50px -34px rgba(0,0,0,0.95)' : '0 14px 34px -28px rgba(28,28,28,0.36)'};
        }
        
        .menu-item:hover {
          transform: translateY(-2px);
        }
        
        .menu-item-dark:hover {
          border-color: ${theme.colors.primary}80;
          background: linear-gradient(135deg, ${theme.colors.primary}1a 0%, rgba(255,255,255,0.03) 100%);
        }
        
        .menu-item-light:hover {
          border-color: ${theme.colors.primary}55;
          box-shadow: 0 20px 45px -32px rgba(28,28,28,0.46);
        }
        
        .category-pill {
          transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease, color 0.2s ease;
        }

        .category-pill:hover {
          transform: translateY(-1px);
        }
        
        .fade-in {
          animation: fadeIn 0.5s ease-out forwards;
          opacity: 0;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .item-image {
          transition: transform 0.45s ease;
        }
        
        .menu-item:hover .item-image {
          transform: scale(1.08);
        }
        
        .price-line {
          flex: 1;
          height: 1px;
          margin: 0 14px 6px;
          min-width: 20px;
          opacity: 0.28;
        }
        
        .price-line-dark {
          background: linear-gradient(270deg, transparent, ${theme.colors.primary}40, transparent);
        }
        
        .price-line-light {
          border-bottom: 1px dotted currentColor;
          background: transparent;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .gold-glow {
          text-shadow: 0 0 20px ${theme.colors.primary}4d;
        }
        
        .card-glow {
          box-shadow: 0 0 0 1px ${theme.colors.border}, 
                      0 4px 20px -4px rgba(0,0,0,0.5),
                      inset 0 1px 0 0 rgba(255,255,255,0.05);
        }
        
        .nav-glow {
          box-shadow: 0 18px 45px -32px rgba(0,0,0,0.85);
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        .shimmer-border {
          position: relative;
        }
        
        .shimmer-border::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(90deg, transparent, ${theme.colors.primary}40, transparent);
          background-size: 200% 100%;
          animation: shimmer 3s infinite linear;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }

        .section-kicker {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        @media (max-width: 640px) {
          .price-line {
            display: none;
          }
        }
      `}</style>

      <div
        className="menu-container menu-surface min-h-screen"
        dir="ltr"
        style={{
          backgroundColor: theme.colors.background,
          color: theme.colors.text,
          fontFamily: "'Cairo', " + theme.font.body,
        }}
      >
        {isPaused ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center max-w-md mx-auto px-6 py-12">
              <div
                className="inline-flex items-center justify-center p-6 rounded-full mb-6"
                style={{ backgroundColor: theme.colors.border }}
              >
                <PauseGlyph color={theme.colors.primary} />
              </div>
              <h1
                className="text-2xl font-bold mb-3"
                style={{
                  fontFamily: "'Cairo', " + theme.font.heading,
                  color: theme.colors.text,
                }}
              >
                Menu temporairement indisponible
              </h1>
              <p
                className="text-base"
                style={{ color: theme.colors.muted }}
              >
                Nous nous excusons pour la gêne occasionnée. Le menu n'est pas disponible pour le moment.
              </p>
              <p
                className="text-sm mt-4"
                style={{ color: theme.colors.muted }}
              >
                {business.name}
              </p>
            </div>
          </div>
        ) : (
          <>
            <header className="hero-shell relative overflow-hidden px-4 pt-6 pb-8 sm:px-6 sm:pt-10 sm:pb-12">
          <div 
            className="absolute inset-0 opacity-[0.055]"
            style={{
              backgroundImage: `linear-gradient(${theme.colors.border} 1px, transparent 1px), linear-gradient(90deg, ${theme.colors.border} 1px, transparent 1px)`,
              backgroundSize: '36px 36px',
            }}
          />
          
          <div className="relative mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="text-center lg:text-left">
            <div className="mb-6 flex items-center justify-center gap-3 lg:justify-start">
              {business.logo_url && (
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-lg border p-2 sm:h-20 sm:w-20"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.86)',
                    borderColor: theme.colors.border,
                  }}
                >
                  <img 
                    src={business.logo_url} 
                    alt={business.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </span>
              )}
              <span
                className="rounded-full border px-4 py-2 text-xs font-semibold"
                style={{
                  borderColor: theme.colors.border,
                  color: theme.colors.muted,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.74)',
                }}
              >
                {totalVisibleItems} articles
              </span>
            </div>
            
            <h1
              className={`mx-auto max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl lg:mx-0 lg:text-6xl ${isDark ? 'gold-glow' : ''}`}
              style={{ 
                fontFamily: "'Cairo', " + theme.font.heading,
                color: isDark ? theme.colors.primary : theme.colors.text,
              }}
            >
              {business.name}
            </h1>
            
            <div 
              className="mt-6 flex items-center justify-center gap-4 lg:justify-start"
            >
              <span 
                className="h-px w-16 sm:w-24"
                style={{ 
                  background: isDark 
                    ? `linear-gradient(270deg, transparent, ${theme.colors.primary}, transparent)` 
                    : theme.colors.border 
                }}
              />
              {isDark ? (
                <span style={{ color: theme.colors.primary }}>✦</span>
              ) : (
                <span 
                  className="text-xs tracking-[0.2em] uppercase font-medium"
                  style={{ color: theme.colors.muted }}
                >
                  Menu
                </span>
              )}
              <span 
                className="h-px w-16 sm:w-24"
                style={{ 
                  background: isDark 
                    ? `linear-gradient(90deg, transparent, ${theme.colors.primary}, transparent)` 
                    : theme.colors.border 
                }}
              />
            </div>
            </div>

            {heroImageUrl && (
              <div className="hero-media fade-in relative h-56 overflow-hidden rounded-lg border sm:h-72 lg:h-96" style={{ borderColor: theme.colors.border, animationDelay: '0.2s' }}>
                <img 
                  src={heroImageUrl} 
                  alt={business.name}
                  className="h-full w-full object-cover"
                />
                <div 
                  className="absolute inset-0"
                  style={{
                    background: isDark
                      ? 'linear-gradient(90deg, rgba(5,5,5,0.72), rgba(5,5,5,0.08) 58%, rgba(5,5,5,0.4))'
                      : 'linear-gradient(90deg, rgba(0,0,0,0.46), transparent 58%, rgba(0,0,0,0.18))',
                  }}
                />
              </div>
            )}
          </div>
        </header>

        {visibleCategories.length > 1 && (
          <nav 
            className={`sticky top-0 z-20 border-y backdrop-blur-xl ${isDark ? 'nav-glow' : ''}`}
            style={{ 
              backgroundColor: isDark ? `${theme.colors.background}ee` : `${theme.colors.background}f5`,
              borderColor: theme.colors.border,
            }}
          >
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="flex overflow-x-auto py-3 gap-3 scrollbar-hide justify-start lg:justify-center">
                {visibleCategories.map((category) => {
                  const isActive = activeCategory === category.id
                  return (
                    <button
                      key={category.id}
                      onClick={() => {
                        setActiveCategory(category.id)
                        document.getElementById(`cat-${category.id}`)?.scrollIntoView({ 
                          behavior: 'smooth',
                          block: 'start',
                        })
                      }}
                      className="category-pill whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold"
                      style={{
                        backgroundColor: isActive 
                          ? theme.colors.primary 
                          : isDark ? theme.colors.secondary : 'transparent',
                        color: isActive 
                          ? (isDark ? '#000' : '#FFF')
                          : theme.colors.muted,
                        border: `1px solid ${isActive 
                          ? theme.colors.primary 
                          : theme.colors.border}`,
                        boxShadow: isActive && isDark 
                          ? `0 0 20px ${theme.colors.primary}40` 
                          : 'none',
                      }}
                    >
                      {category.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </nav>
        )}

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          {totalVisibleItems > 0 && (
            <div className="mb-8 flex justify-end">
              <RouletteButton
                slug={business.slug}
                accent={theme.colors.primary}
                gradient={`linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primary})`}
                size={46}
              />
            </div>
          )}
          <div className="space-y-14">
            {visibleCategories.map((category, catIndex) => (
              <section 
                key={category.id} 
                id={`cat-${category.id}`}
                className="scroll-mt-24 fade-in"
                style={{ animationDelay: `${0.1 + catIndex * 0.1}s` }}
              >
                <div className="mb-6">
                  {category.image_url ? (
                    <div 
                      className={`relative h-44 overflow-hidden rounded-lg sm:h-56 ${isDark ? 'card-glow' : ''}`}
                      style={{ border: `1px solid ${theme.colors.border}` }}
                    >
                      <img
                        src={category.image_url}
                        alt={category.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                      <div 
                        className="absolute inset-0"
                        style={{ 
                          background: isDark 
                            ? 'linear-gradient(to top, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.6) 40%, transparent 100%)' 
                            : 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.6))',
                        }}
                      />
                      <div className="absolute bottom-0 right-0 left-0 p-5">
                        <h2
                          className={`text-2xl sm:text-3xl font-semibold ${isDark ? 'gold-glow' : ''}`}
                          style={{ 
                            fontFamily: "'Cairo', " + theme.font.heading,
                            color: isDark ? theme.colors.primary : '#FFF',
                            textShadow: isDark ? 'none' : '0 2px 4px rgba(0,0,0,0.3)',
                          }}
                        >
                          {category.name}
                        </h2>
                      </div>
                    </div>
                  ) : (
                    <div className={`flex items-end justify-between gap-4 border-b pb-4 ${isDark ? 'py-4' : ''}`} style={{ borderColor: theme.colors.border }}>
                      <h2
                        className={`text-2xl font-semibold sm:text-3xl ${isDark ? 'gold-glow' : ''}`}
                        style={{ 
                          fontFamily: "'Cairo', " + theme.font.heading,
                          color: theme.colors.primary,
                        }}
                      >
                        {category.name}
                      </h2>
                      <div 
                        className="h-0.5 w-20 flex-shrink-0 rounded-full"
                        style={{ 
                          background: isDark 
                            ? `linear-gradient(90deg, transparent, ${theme.colors.primary}, transparent)` 
                            : theme.colors.accent 
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {category.items
                    .filter((item) => item.available)
                    .map((item, itemIndex) => (
                      <article
                        key={item.id}
                        className={`menu-item rounded-lg border p-4 ${isDark ? 'menu-item-dark' : 'menu-item-light'}`}
                        style={{
                          animationDelay: `${0.2 + itemIndex * 0.05}s`,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.88)',
                          borderColor: theme.colors.border,
                        }}
                      >
                        <div className="flex min-h-[88px] items-start gap-4" dir="ltr">
                          {/* End left: Product image (no border, no rounded corners) */}
                          {item.image_url && (
                            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg sm:h-24 sm:w-24">
                              <img
                                src={item.image_url}
                                alt={item.name}
                                loading="lazy"
                                decoding="async"
                                className="item-image w-full h-full object-cover"
                              />
                            </div>
                          )}
                          
                          {/* Right of image: Title + details */}
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <h3 
                              className="break-words text-base font-semibold sm:text-lg"
                              style={{ 
                                fontFamily: "'Cairo', " + theme.font.heading,
                                color: theme.colors.text,
                              }}
                            >
                              {item.name}
                            </h3>
                            
                            {item.description && (
                              <p 
                                className="mt-1.5 line-clamp-2 text-sm leading-relaxed"
                                style={{ color: theme.colors.muted }}
                              >
                                {item.description}
                              </p>
                            )}
                          </div>
                          
                          {/* Middle: Line separator */}
                          <span 
                            className={`price-line flex-shrink-0 flex-1 min-w-[20px] ${isDark ? 'price-line-dark' : 'price-line-light'}`}
                            style={{ color: theme.colors.muted, alignSelf: 'center' }}
                          />
                          
                          {/* End right: Price + inline add-to-cart */}
                          {(item.price || ordering) && (
                            <div className="flex flex-shrink-0 flex-col items-end gap-2">
                              {item.price && (
                                <span
                                  className={`rounded-full px-3 py-1 text-sm font-bold sm:text-base whitespace-nowrap ${isDark ? 'gold-glow' : ''}`}
                                  style={{
                                    color: isDark ? theme.colors.primary : theme.colors.text,
                                    backgroundColor: isDark ? `${theme.colors.primary}18` : `${theme.colors.accent}24`,
                                  }}
                                  dir="ltr"
                                >
                                  {Number(item.price).toFixed(2)} TND
                                </span>
                              )}
                              {ordering && <AddToCart item={item} accent={theme.colors.primary} size="sm" />}
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                </div>
              </section>
            ))}
          </div>

          {visibleCategories.length === 0 && (
            <div className="text-center py-20">
              <div
                className={`inline-flex items-center justify-center p-6 rounded-full mb-6 ${isDark ? 'shimmer-border' : ''}`}
                style={{ backgroundColor: theme.colors.secondary }}
              >
                <FoodIcon kind="utensils" className="h-9 w-9" style={{ color: theme.colors.primary }} strokeWidth={1.5} />
              </div>
              <h2 
                className={`text-xl font-medium mb-2 ${isDark ? 'gold-glow' : ''}`}
                style={{ 
                  fontFamily: "'Cairo', " + theme.font.heading,
                  color: isDark ? theme.colors.primary : theme.colors.text,
                }}
              >
                Menu à venir
              </h2>
              <p className="text-sm" style={{ color: theme.colors.muted }}>
                Nous préparons quelque chose d'exceptionnel
              </p>
            </div>
          )}
        </main>

        <footer 
          className={`text-center py-10 mt-12 border-t ${isDark ? 'relative overflow-hidden' : ''}`}
          style={{ borderColor: theme.colors.border }}
        >
          {isDark && (
            <div 
              className="absolute inset-0 opacity-5"
              style={{ background: `radial-gradient(circle at 50% 0%, ${theme.colors.primary}, transparent 50%)` }}
            />
          )}
          <div className="relative">
            {/* Socials + game + loyalty live in the unified MenuDock below. */}
            <p className="text-xs tracking-[0.15em] uppercase" style={{ color: theme.colors.muted }}>
              {business.name}
            </p>
          </div>
        </footer>
          </>
        )}
      </div>
      {!isPaused && (
        <MenuDock
          business={business}
          categories={visibleCategories as any}
          accent={theme.colors.primary}
          includeSurprise={false}
        />
      )}
    </>
  )
}

// ============================================
// MINIMAL THEME - Unique Split Layout
// ============================================
function MinimalLayout({
  business,
  categories,
  theme,
  isPaused,
  ordering = false,
  activeCategory,
  setActiveCategory,
  expandedItem,
  setExpandedItem,
}: {
  business: Business
  categories: Category[]
  theme: Theme
  isPaused: boolean
  ordering?: boolean
  activeCategory: string | null
  setActiveCategory: (id: string | null) => void
  expandedItem: string | null
  setExpandedItem: (id: string | null) => void
}) {
  const activeItems = categories.find(c => c.id === activeCategory)?.items.filter(i => i.available) || []
  const minimalAllItems = categories.flatMap((c) => c.items).filter((i) => i.available)

  return (
    <div
      className="minimal-container flex flex-col"
      dir="ltr"
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        fontFamily: "'Cairo', " + theme.font.body,
      }}
    >
      <DynamicFavicon logoUrl={business.logo_url} businessName={business.name} />
        {isPaused ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center max-w-md mx-auto px-6 py-12">
              <div
                className="inline-flex items-center justify-center p-6 rounded-full mb-6"
                style={{ backgroundColor: theme.colors.border }}
              >
                <PauseGlyph color={theme.colors.primary} />
              </div>
              <h1
                className="text-2xl font-bold mb-3"
                style={{
                  fontFamily: "'Cairo', " + theme.font.heading,
                  color: theme.colors.text,
                }}
              >
                Menu temporairement indisponible
              </h1>
              <p
                className="text-base"
                style={{ color: theme.colors.muted }}
              >
                Nous nous excusons pour la gêne occasionnée. Le menu n'est pas disponible pour le moment.
              </p>
              <p 
                className="text-sm mt-4"
                style={{ color: theme.colors.muted }}
              >
                {business.name}
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
            {/* Compact Header */}
            <header 
              className="border-b px-4 sm:px-6 py-4 sm:py-6"
              style={{ borderColor: theme.colors.border }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  {business.logo_url && (
                    <img 
                      src={business.logo_url} 
                      alt={business.name}
                      className="h-10 w-auto sm:h-12 sm:w-auto object-contain"
                    />
                  )}
                  <div>
                    <h1 
                      className="text-lg sm:text-xl font-semibold tracking-tight"
                      style={{ fontFamily: "'Cairo', " + theme.font.heading }}
                    >
                      {business.name}
                    </h1>
                    <p className="text-xs sm:text-sm" style={{ color: theme.colors.muted }}>
                      Menu
                    </p>
                  </div>
                </div>
                
                {/* Item count badge - Hidden on mobile */}
                <div 
                  className="hidden sm:block text-xs px-3 py-1 rounded-full font-medium"
                  style={{ 
                    backgroundColor: theme.colors.secondary,
                    color: theme.colors.muted,
                    border: `1px solid ${theme.colors.border}`,
                  }}
                >
                  {categories.reduce((acc, cat) => acc + cat.items.filter(i => i.available).length, 0)} articles
                </div>
              </div>
            </header>

            {/* Main Layout */}
            <div className="flex-1 flex flex-col md:flex-row">
          
            {/* Category Sidebar */}
            <aside
              className="border-b md:border-b-0 md:border-r md:w-52 flex-shrink-0"
              style={{ borderColor: theme.colors.border }}
            >
            {/* Mobile: Horizontal scroll */}
            <div className="md:hidden overflow-x-auto mobile-scroll">
              <div className="flex px-4 py-3 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className="whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all"
                    style={{
                      backgroundColor: activeCategory === cat.id 
                        ? theme.colors.primary 
                        : theme.colors.secondary,
                      color: activeCategory === cat.id 
                        ? '#FFF' 
                        : theme.colors.text,
                      border: `1px solid ${activeCategory === cat.id ? theme.colors.primary : theme.colors.border}`,
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Desktop: Vertical list */}
            <nav className="hidden md:block sticky top-0 py-6 px-4 max-h-screen overflow-y-auto scrollbar-thin">
              <p 
                className="text-xs font-medium uppercase tracking-wider mb-4 px-3"
                style={{ color: theme.colors.muted }}
              >
                Catégories
              </p>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`category-tab w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${activeCategory === cat.id ? 'active' : ''}`}
                    style={{
                      backgroundColor: activeCategory === cat.id 
                        ? theme.colors.secondary 
                        : 'transparent',
                      color: activeCategory === cat.id 
                        ? theme.colors.primary 
                        : theme.colors.text,
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </nav>
          </aside>

            {/* Items Content */}
            <main className="flex-1 overflow-y-auto">
              <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8">

              {minimalAllItems.length > 0 && (
                <div className="mb-6 flex justify-end">
                  <RouletteButton
                    slug={business.slug}
                    accent={theme.colors.primary}
                    gradient={`linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primary})`}
                    size={46}
                  />
                </div>
              )}

              {/* Active Category Header */}
              {activeCategory && (
                <div className="mb-6 minimal-fade">
                  {categories.find(c => c.id === activeCategory)?.image_url && (
                    <div 
                      className="relative h-32 sm:h-40 rounded-xl overflow-hidden mb-4"
                      style={{ border: `1px solid ${theme.colors.border}` }}
                    >
                      <img 
                        src={categories.find(c => c.id === activeCategory)?.image_url || ''} 
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <div 
                        className="absolute inset-0"
                        style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.4), transparent)' }}
                      />
                      <h2
                        className="absolute bottom-4 left-4 text-2xl font-semibold text-white"
                        style={{ fontFamily: "'Cairo', " + theme.font.heading }}
                      >
                        {categories.find(c => c.id === activeCategory)?.name}
                      </h2>
                    </div>
                  )}
                  
                  {!categories.find(c => c.id === activeCategory)?.image_url && (
                    <div className="flex items-center justify-between mb-4 pb-4 border-b" style={{ borderColor: theme.colors.border }}>
                      <h2 
                        className="text-2xl font-semibold"
                        style={{ fontFamily: "'Cairo', " + theme.font.heading }}
                      >
                        {categories.find(c => c.id === activeCategory)?.name}
                      </h2>
                      <span className="text-sm" style={{ color: theme.colors.muted }}>
                        {activeItems.length} articles
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Items Grid */}
              <div className="space-y-3">
                {activeItems.map((item, idx) => (
                  <div
                    role="button"
                    tabIndex={0}
                    key={item.id}
                    onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedItem(expandedItem === item.id ? null : item.id) } }}
                    aria-expanded={expandedItem === item.id}
                    className="minimal-item minimal-fade cursor-pointer rounded-xl p-4 w-full text-left"
                    style={{
                      backgroundColor: theme.colors.secondary,
                      border: `1px solid ${expandedItem === item.id ? theme.colors.accent : theme.colors.border}`,
                      animationDelay: `${idx * 0.05}s`,
                    }}
                  >
                    <div className="flex items-start gap-4" dir="ltr">
                      {/* End left: Product image (no border, no rounded corners) */}
                      {item.image_url && (
                        <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 overflow-hidden">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      {/* Right of image: Title + details */}
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <h3 
                          className="font-semibold text-base break-words"
                          style={{ fontFamily: "'Cairo', " + theme.font.heading }}
                        >
                          {item.name}
                        </h3>
                        {item.description && !expandedItem && (
                          <p 
                            className="text-sm mt-0.5 line-clamp-1 break-words"
                            style={{ color: theme.colors.muted }}
                          >
                            {item.description}
                          </p>
                        )}
                        
                        {/* Expanded Content */}
                        <div 
                          className="item-expand"
                          style={{ 
                            maxHeight: expandedItem === item.id ? '200px' : '0',
                            marginTop: expandedItem === item.id ? '12px' : '0',
                            opacity: expandedItem === item.id ? 1 : 0,
                          }}
                        >
                          {item.description && (
                            <p 
                              className="text-sm leading-relaxed break-words"
                              style={{ color: theme.colors.muted }}
                            >
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Middle: Line separator */}
                      <div className="flex-1 min-w-[20px]" style={{ alignSelf: 'center' }}>
                        <span 
                          className="block w-full border-b"
                          style={{ borderColor: theme.colors.border }}
                        />
                      </div>
                      
                      {/* End right: Price + Expand indicator */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Expand indicator */}
                        <div 
                          className="transition-transform"
                          style={{ 
                            transform: expandedItem === item.id ? 'rotate(180deg)' : 'rotate(0)',
                            color: theme.colors.muted,
                          }}
                        >
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        
                        {item.price && (
                          <span
                            className="font-bold text-base whitespace-nowrap"
                            style={{ color: theme.colors.text }}
                            dir="ltr"
                          >
                            {Number(item.price).toFixed(2)} TND
                          </span>
                        )}
                        {ordering && <AddToCart item={item} accent={theme.colors.primary} size="sm" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Empty State */}
              {activeItems.length === 0 && (
                <div className="text-center py-16">
                  <div
                    className="inline-flex items-center justify-center p-4 rounded-full mb-4"
                    style={{ backgroundColor: theme.colors.border }}
                  >
                    <FoodIcon kind="utensils" className="h-7 w-7" style={{ color: theme.colors.primary }} strokeWidth={1.5} />
                  </div>
                  <p style={{ color: theme.colors.muted }}>
                    Aucun article dans cette catégorie
                  </p>
                </div>
              )}
              </div>
            </main>
            </div>

            {/* Minimal Footer — socials + game + loyalty live in MenuDock. */}
            <footer
              className="border-t py-4 px-4 text-center"
              style={{ borderColor: theme.colors.border }}
            >
              <p className="text-xs" style={{ color: theme.colors.muted }}>
                © {business.name}
              </p>
            </footer>
          </div>
        )}
        {!isPaused && (
          <MenuDock
            business={business}
            categories={categories as any}
            accent={theme.colors.primary}
            includeSurprise={false}
          />
        )}
      </div>
  )
}

/** On-brand "paused" glyph (two bars) — replaces the ⏸️ emoji. */
function PauseGlyph({ color }: { color: string }) {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill={color} stroke="none" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1.5" />
      <rect x="14" y="5" width="4" height="14" rx="1.5" />
    </svg>
  )
}

