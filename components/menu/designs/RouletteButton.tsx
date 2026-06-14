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

  // Labeled → a compact CTA pill ("Gagnez 🎁" + a spinning-wheel chip); otherwise
  // a bare wheel button. Either way everything is laid out INLINE — nothing floats
  // above the button — so the caption can never be clipped by a sticky bar or a
  // rounded/overflow-hidden card again.
  const labeled = !!label
  const chip = labeled ? Math.round(size * 0.8) : size
  const wheel = Math.round(chip * 0.56)

  const Wheel = (
    <svg viewBox="0 0 40 40" width={wheel} height={wheel} aria-hidden="true" className="rb-spin">
      <circle cx="20" cy="20" r="17" fill="none" stroke="#fff" strokeWidth="1.3" opacity="0.5" />
      <circle cx="20" cy="20" r="14.5" fill="none" stroke="#fff" strokeWidth="2.3" />
      <g stroke="#fff" strokeWidth="1.5" strokeLinecap="round">
        <line x1="20" y1="20" x2="20" y2="6.5" />
        <line x1="20" y1="20" x2="31.7" y2="13.25" />
        <line x1="20" y1="20" x2="31.7" y2="26.75" />
        <line x1="20" y1="20" x2="20" y2="33.5" />
        <line x1="20" y1="20" x2="8.3" y2="26.75" />
        <line x1="20" y1="20" x2="8.3" y2="13.25" />
      </g>
      <circle cx="20" cy="20" r="3.1" fill="#fff" />
    </svg>
  )

  return (
    <>
      <style jsx>{`
        @keyframes rb-spin { to { transform: rotate(360deg) } }
        @keyframes rb-glow {
          0%, 100% { box-shadow: 0 8px 18px -10px ${accent}66 }
          50% { box-shadow: 0 14px 30px -8px ${accent}cc }
        }
        .rb-spin { animation: rb-spin 9s linear infinite; transform-origin: 50% 50% }
        .rb-glow { animation: rb-glow 2.8s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce) {
          .rb-spin, .rb-glow { animation: none !important }
        }
      `}</style>

      {labeled ? (
        <Link
          href={`/${slug}/jeu`}
          aria-label="Tentez votre chance — jouez à la roulette"
          title="Tentez votre chance"
          className={`inline-flex shrink-0 items-center gap-2 bg-white pl-4 pr-[5px] shadow-[0_8px_22px_-12px_rgba(0,0,0,0.45)] ring-1 ring-black/[0.06] transition hover:-translate-y-0.5 active:scale-95 ${rounded} ${className}`}
          style={{ height: size, fontFamily: font }}
        >
          <span className="whitespace-nowrap text-[12.5px] font-extrabold leading-none" style={{ color: accent }}>
            {label}
          </span>
          <span
            className="rb-glow relative flex shrink-0 items-center justify-center rounded-full text-white"
            style={{ width: chip, height: chip, backgroundImage: gradient }}
          >
            {Wheel}
          </span>
        </Link>
      ) : (
        <Link
          href={`/${slug}/jeu`}
          aria-label="Tentez votre chance — jouez à la roulette"
          title="Tentez votre chance"
          className={`rb-glow relative flex shrink-0 items-center justify-center text-white transition active:scale-95 ${rounded} ${className}`}
          style={{ width: size, height: size, backgroundImage: gradient, fontFamily: font }}
        >
          {Wheel}
        </Link>
      )}
    </>
  )
}
