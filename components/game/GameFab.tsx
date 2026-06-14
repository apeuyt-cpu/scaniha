'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

/**
 * Dedicated floating ROULETTE-WHEEL button shown on EVERY public menu when a
 * game is active. It's the single entry point both to PLAY and to the diner's
 * account — it links to /[slug]/jeu, which handles login → spin → "Mon compte".
 *
 * Self-detects an active game via GET /api/game/[slug] and renders nothing
 * otherwise (so design previews, which pass an empty slug, stay clean).
 *
 * Position: bottom-right, ABOVE the unified MenuDock (the dock sits at
 * bottom-4 right-4; this sits higher at bottom-[5.5rem]) so the two never
 * overlap, and well clear of the bottom-LEFT Scaniha attribution tag.
 */
export default function GameFab({ slug }: { slug: string }) {
  const [game, setGame] = useState(false)
  const [accent, setAccent] = useState('#F47B20')

  useEffect(() => {
    if (!slug) return // design previews pass an empty slug — nothing to fetch
    let cancelled = false
    fetch(`/api/game/${slug}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        if (j?.accent) setAccent(j.accent)
        setGame(Boolean(j?.active))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [slug])

  if (!game) return null

  return (
    <Link
      href={`/${slug}/jeu`}
      aria-label="Tentez votre chance — jouez à la roulette"
      title="Tentez votre chance"
      className="game-fab fixed bottom-[5.5rem] right-4 z-50 flex items-center gap-2.5 rounded-full bg-white py-1.5 pl-2 pr-1.5 shadow-[0_16px_38px_-10px_rgba(0,0,0,0.5)] ring-1 ring-black/5 transition hover:-translate-y-0.5 active:scale-95 sm:pl-4"
    >
      <style jsx global>{`
        @keyframes game-fab-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes game-fab-pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.06);
          }
        }
        .game-fab .game-fab-wheel {
          animation: game-fab-spin 9s linear infinite;
        }
        .game-fab .game-fab-disc {
          animation: game-fab-pulse 2.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .game-fab .game-fab-wheel,
          .game-fab .game-fab-disc {
            animation: none !important;
          }
        }
      `}</style>

      {/* Label — full on ≥sm, hidden on the smallest screens to keep the tap
          target compact next to the dock. */}
      <span
        className="hidden whitespace-nowrap text-[13px] font-extrabold sm:inline"
        style={{ color: '#15110C' }}
      >
        Tentez votre chance
      </span>

      {/* The wheel itself — a segmented disc that gently spins, with a fixed
          pointer on top. ≥44px tap target. */}
      <span
        className="game-fab-disc relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
        style={{
          backgroundColor: accent,
          boxShadow: `0 8px 20px -6px ${accent}cc`,
        }}
      >
        <svg
          viewBox="0 0 40 40"
          width="30"
          height="30"
          aria-hidden="true"
          className="game-fab-wheel"
        >
          <defs>
            <clipPath id="game-fab-clip">
              <circle cx="20" cy="20" r="16" />
            </clipPath>
          </defs>
          {/* 6 alternating segments forming a roulette wheel */}
          <g clipPath="url(#game-fab-clip)">
            <rect x="0" y="0" width="40" height="40" fill="#ffffff" />
            <path d="M20 20 L20 2 A18 18 0 0 1 35.6 11 Z" fill={accent} />
            <path d="M20 20 L35.6 29 A18 18 0 0 1 20 38 Z" fill={accent} />
            <path d="M20 20 L4.4 11 A18 18 0 0 1 20 2 Z" fill="#F5B82E" />
            <path d="M20 20 L4.4 29 A18 18 0 0 1 4.4 11 Z" fill="#F5B82E" />
            <path d="M20 20 L20 38 A18 18 0 0 1 4.4 29 Z" fill={accent} />
            <path d="M20 20 L35.6 11 A18 18 0 0 1 35.6 29 Z" fill="#F5B82E" />
          </g>
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
          />
          <circle cx="20" cy="20" r="3.4" fill="#ffffff" />
        </svg>
        {/* Fixed pointer (does not spin) */}
        <svg
          viewBox="0 0 12 12"
          width="11"
          height="11"
          aria-hidden="true"
          className="absolute -top-0.5 left-1/2 -translate-x-1/2"
        >
          <path d="M6 11 L1 1 L11 1 Z" fill="#15110C" />
        </svg>
      </span>
    </Link>
  )
}
