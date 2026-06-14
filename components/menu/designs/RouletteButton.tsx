'use client'

// Inline "Tentez votre chance" entry button — sits right next to the search bar
// in EVERY design (it replaced the old Surprends-moi dice). It wears the OWNER's
// theme (accent / gradient) and only renders when a roulette game is live.
//
// To pull players in it is gently animated and carries a small conversion caption
// ("Gagnez 🎁") above the icon:
//   • the wheel spins slowly,
//   • the button breathes a soft accent glow,
//   • the caption bobs to catch the eye.
// All motion respects prefers-reduced-motion. The caption is kept compact so it
// stays inside each design's header gap (some sit in sticky bars / clipped cards).
//
// The roulette PAGE itself (/[slug]/jeu) stays Scaniha-branded — handled there.

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function RouletteButton({
  slug,
  accent = '#F47B20',
  gradient = 'linear-gradient(135deg, #F47B20, #F5B82E)',
  font,
  size = 48,
  rounded = 'rounded-2xl',
  className = '',
  label = 'Gagnez 🎁',
}: {
  /** Business slug — the button links to `/${slug}/jeu`. */
  slug: string
  accent?: string
  gradient?: string
  font?: string
  /** Square button side in px — match the adjacent search bar height. */
  size?: number
  /** Corner radius class — match the search bar (e.g. 'rounded-full'). */
  rounded?: string
  /** Extra classes for the trigger (e.g. positioning from the design). */
  className?: string
  /** Small conversion caption shown above the icon. Pass '' to hide it. */
  label?: string
}) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!slug) return // design previews pass no slug → nothing to fetch
    let cancelled = false
    fetch(`/api/game/${slug}`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setActive(Boolean(j?.active)) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [slug])

  // No live game → render nothing (the search bar simply takes the full width).
  if (!active || !slug) return null

  const wheel = Math.round(size * 0.54)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size, fontFamily: font }}>
      <style jsx>{`
        @keyframes rb-spin { to { transform: rotate(360deg) } }
        @keyframes rb-bob { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-2.5px) } }
        @keyframes rb-glow {
          0%, 100% { box-shadow: 0 8px 18px -10px ${accent}80 }
          50% { box-shadow: 0 12px 26px -8px ${accent}d9 }
        }
        .rb-spin { animation: rb-spin 8s linear infinite; transform-origin: 50% 50% }
        .rb-bob { animation: rb-bob 2.4s ease-in-out infinite }
        .rb-glow { animation: rb-glow 2.6s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce) {
          .rb-spin, .rb-bob, .rb-glow { animation: none !important }
        }
      `}</style>

      {/* Conversion caption — compact pill that bobs above the icon */}
      {label ? (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2">
          <span
            className="rb-bob block whitespace-nowrap rounded-full bg-white px-2 py-[3px] text-[10px] font-extrabold leading-none shadow-[0_6px_16px_-6px_rgba(0,0,0,0.4)] ring-1 ring-black/5"
            style={{ color: accent }}
          >
            {label}
          </span>
        </span>
      ) : null}

      <Link
        href={`/${slug}/jeu`}
        aria-label="Tentez votre chance — jouez à la roulette"
        title="Tentez votre chance"
        className={`rb-glow flex h-full w-full items-center justify-center text-white transition active:scale-95 ${rounded} ${className}`}
        style={{ backgroundImage: gradient }}
      >
        <svg viewBox="0 0 40 40" width={wheel} height={wheel} aria-hidden="true" className="rb-spin">
          <circle cx="20" cy="20" r="16" fill="none" stroke="#fff" strokeWidth="2.4" />
          <g stroke="#fff" strokeWidth="1.6" strokeLinecap="round">
            <line x1="20" y1="20" x2="20" y2="5" />
            <line x1="20" y1="20" x2="33" y2="12.5" />
            <line x1="20" y1="20" x2="33" y2="27.5" />
            <line x1="20" y1="20" x2="20" y2="35" />
            <line x1="20" y1="20" x2="7" y2="27.5" />
            <line x1="20" y1="20" x2="7" y2="12.5" />
          </g>
          <circle cx="20" cy="20" r="3.4" fill="#fff" />
        </svg>
      </Link>
    </div>
  )
}
