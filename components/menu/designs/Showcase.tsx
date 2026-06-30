'use client'

import { useEffect, useRef, useState } from 'react'
import { ItemDetailModal, type SheetItem } from './MenuSheets'
import { FoodIcon } from './icons'

function fmt(price: number | null): string {
  if (price == null || isNaN(Number(price))) return '—'
  return `${Number(price).toFixed(2)} TND`
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface ShowcaseProps {
  /** Initial (SSR-stable) items to render. */
  items: SheetItem[]
  /** Full pool used to re-randomize on mount when `randomize` is true. */
  pool?: SheetItem[]
  /** When true, pick a fresh random sample on mount (varies per visit). */
  randomize?: boolean
  /** Number of slides to show. */
  count?: number
  accent?: string
  /** 'card' = tall hero card (designs 1 & 2). 'banner' = wide strip (designs 3 & 4). */
  variant?: 'card' | 'banner'
  autoSlide?: boolean
  intervalMs?: number
  showPrices?: boolean
  title?: string
  subtitle?: string
  /** Optional CSS gradient for the price chip (falls back to solid `accent`). */
  chipGradient?: string
  /** Slide transition duration in ms (lower = snappier). */
  transitionMs?: number
  /** When provided, a slide tap calls this instead of opening the built-in
   *  bottom-sheet — so the parent design can open its own (consistent) modal. */
  onSelect?: (item: SheetItem) => void
}

export default function Showcase({
  items,
  pool,
  randomize = false,
  count = 6,
  accent = '#F97316',
  variant = 'card',
  autoSlide = true,
  intervalMs = 4000,
  showPrices = true,
  title,
  subtitle,
  chipGradient,
  transitionMs = 420,
  onSelect,
}: ShowcaseProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [display, setDisplay] = useState<SheetItem[]>(items)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<SheetItem | null>(null)
  const pausedRef = useRef(false)
  const selectedRef = useRef(false)
  const onscreenRef = useRef(true)
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  selectedRef.current = selected !== null

  // Re-randomize once on mount (client only → hydration-safe, fresh each visit).
  useEffect(() => {
    if (randomize && pool && pool.length > 0) {
      setDisplay(shuffle(pool).slice(0, count))
      setIndex(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pause auto-advance while this slider is scrolled offscreen — Design1 mounts
  // two perpetual sliders, so an offscreen one shouldn't keep churning timers/rAF.
  useEffect(() => {
    const el = sectionRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => {
        onscreenRef.current = entry.isIntersecting
      },
      { rootMargin: '120px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const total = display.length

  // Auto-advance — paused on hover/touch, offscreen, while a detail is open, for reduced-motion, or <2 slides.
  useEffect(() => {
    if (!autoSlide || total < 2) return
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const ms = Math.min(8000, Math.max(1000, intervalMs || 2000))
    const id = setInterval(() => {
      if (pausedRef.current || selectedRef.current || !onscreenRef.current) return
      setIndex((i) => (i + 1) % total)
    }, ms)
    return () => clearInterval(id)
  }, [autoSlide, intervalMs, total])

  // Center the active slide when index changes. Scrolls ONLY the track —
  // scrollIntoView would also scroll ancestor pages (e.g. the admin page
  // hosting this menu in a preview iframe), causing phantom auto-scrolling.
  // Note: scrollTo({behavior:'smooth'}) is silently cancelled by snap-mandatory
  // in Chrome, so we animate scrollLeft by hand (ends exactly on a snap point).
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const child = track.children[index] as HTMLElement | undefined
    if (!child) return
    const target = Math.max(0, child.offsetLeft - track.offsetLeft - (track.clientWidth - child.offsetWidth) / 2)

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const from = track.scrollLeft
    const delta = target - from
    if (Math.abs(delta) < 1) return
    if (reduce || document.visibilityState === 'hidden') {
      track.scrollLeft = target
      return
    }

    let raf = 0
    const start = performance.now()
    const duration = transitionMs
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      track.scrollLeft = from + delta * ease(t)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    // Hidden/throttled tabs never fire rAF — make sure we still land on target.
    const fallback = setTimeout(() => {
      if (Math.abs(track.scrollLeft - target) > 1) track.scrollLeft = target
    }, duration + 120)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(fallback)
    }
    // transitionMs is a stable prop; intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  // Keep the active dot in sync with manual swiping (debounced until scroll settles).
  const handleScroll = () => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current)
    scrollTimer.current = setTimeout(() => {
      const track = trackRef.current
      if (!track) return
      const tr = track.getBoundingClientRect()
      const trackCenter = tr.left + tr.width / 2
      let nearest = 0
      let best = Infinity
      Array.from(track.children).forEach((c, i) => {
        const r = (c as HTMLElement).getBoundingClientRect()
        const d = Math.abs(r.left + r.width / 2 - trackCenter)
        if (d < best) {
          best = d
          nearest = i
        }
      })
      setIndex((cur) => (cur === nearest ? cur : nearest))
    }, 120)
  }

  if (total === 0) return null

  const slideWidth = variant === 'banner' ? 'w-[86%] lg:w-[48%]' : 'w-full'
  const slideHeight = variant === 'banner' ? 'h-40 lg:h-56' : 'h-44 lg:h-72'

  return (
    <section
      ref={sectionRef}
      className="select-none"
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
      onTouchStart={() => (pausedRef.current = true)}
      onTouchEnd={() => (pausedRef.current = false)}
    >
      {(title || subtitle) && (
        <div className="mb-3 px-1">
          {title && <h2 className="text-lg font-extrabold text-zinc-900">{title}</h2>}
          {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
        </div>
      )}

      <style jsx global>{`
        @keyframes sc-kb { from { transform: scale(1.04) } to { transform: scale(1.13) } }
        .sc-kb { animation: sc-kb 7s ease-in-out infinite alternate; will-change: transform; }
        @media (prefers-reduced-motion: reduce) { .sc-kb { animation: none } }
      `}</style>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto"
      >
        {display.map((item, i) => (
          <button
            key={`${item.id}-${i}`}
            type="button"
            onClick={() => (onSelect ? onSelect(item) : setSelected(item))}
            className={`relative ${slideWidth} ${slideHeight} flex-shrink-0 snap-center overflow-hidden rounded-3xl text-left shadow-md ring-1 ring-black/5 transition active:scale-[0.99]`}
          >
            {item.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image_url} alt={item.name} className="sc-kb absolute inset-0 h-full w-full object-cover" />
            ) : (
              // No photo → branded gradient panel + line glyph (never an empty box).
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${accent}1F, ${accent}3D)` }}
              >
                <FoodIcon hint={item.name} className="h-16 w-16" style={{ color: `${accent}99` }} strokeWidth={1.4} />
              </div>
            )}
            {/* readability gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-white drop-shadow">{item.name}</h3>
                {item.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-white/80">{item.description}</p>
                )}
              </div>
              {showPrices && (
                <span
                  className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold text-white shadow"
                  style={chipGradient ? { backgroundImage: chipGradient } : { backgroundColor: accent }}
                >
                  {fmt(item.price)}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* dots */}
      {total > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {display.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Aller à l'élément ${i + 1}`}
              onClick={() => setIndex(i)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === index ? 18 : 6,
                backgroundColor: i === index ? accent : '#D4D4D8',
              }}
            />
          ))}
        </div>
      )}

      {!onSelect && <ItemDetailModal item={selected} accent={accent} onClose={() => setSelected(null)} />}
    </section>
  )
}
