'use client'

// Floating social button for EVERY public menu — bottom-right. It opens the
// business's social-links popup, themed with the owner's accent/gradient.
//
// The roulette now lives INLINE next to the search bar in each design (see
// RouletteButton), and the old "Plat surprise" dice was removed entirely — so
// this dock is social-only. `categories` / `includeSurprise` are still accepted
// for call-site compatibility but are no longer used.

import { useState } from 'react'
import { SocialPopup, getSocials } from './SocialLinks'
import { brandGradient } from './kit'
import { isFidelityLive } from '@/lib/design-settings'

export function MenuDock({
  business,
  accent = '#F47B20',
  gradient = brandGradient(),
  font,
}: {
  business: any
  categories?: any[]
  accent?: string
  gradient?: string
  font?: string
  /** Kept for call-site compatibility; the dock no longer carries a surprise. */
  includeSurprise?: boolean
}) {
  const [socialOpen, setSocialOpen] = useState(false)

  const socials = getSocials(business)
  if (socials.length === 0) return null

  // Lift above the bottom nav only when it's actually there (fidelity on);
  // otherwise sit in the normal bottom corner so there's no empty gap below.
  const lift = isFidelityLive(business)

  return (
    <>
      <div className={`fixed ${lift ? 'bottom-[5.25rem]' : 'bottom-4'} right-4 z-50 flex flex-col items-end gap-2.5`} style={{ fontFamily: font }}>
        <button
          type="button"
          aria-label="Réseaux sociaux"
          onClick={() => setSocialOpen(true)}
          className="flex items-center gap-2.5 rounded-full bg-white py-1.5 pl-4 pr-1.5 shadow-[0_14px_34px_-10px_rgba(0,0,0,0.45)] ring-1 ring-black/5 transition hover:-translate-y-0.5 active:scale-95"
        >
          <span className="whitespace-nowrap text-[13px] font-bold" style={{ color: '#15110C' }}>
            Réseaux sociaux
          </span>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
            style={{ backgroundImage: gradient, boxShadow: `0 8px 20px -8px ${accent}99` }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
            </svg>
          </span>
        </button>
      </div>

      <SocialPopup business={business} accent={accent} open={socialOpen} onClose={() => setSocialOpen(false)} font={font} />
    </>
  )
}
