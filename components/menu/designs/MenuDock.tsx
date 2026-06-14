'use client'

// Unified floating action dock for EVERY public menu — bottom-right.
// Holds the lightweight engagement actions:
//  • Plat surprise    → the random-reveal flow (whole menu / by category)
//  • Réseaux sociaux  → the business's social popup (only if any socials set)
// The roulette + the diner's account live on the dedicated wheel button
// (GameFab), so they are intentionally NOT in this dock.
//
//  • 1 available action  → a single labelled FAB that triggers it directly.
//  • 2 available actions → a speed-dial: tap to expand a tidy labelled column.

import { useEffect, useState } from 'react'
import { SurpriseFlow, CenteredItemModal, type SxItem } from './interactive'
import { SocialPopup, getSocials } from './SocialLinks'
import { brandGradient } from './kit'

type Cat = {
  id: string | number
  name: string
  image_url?: string | null
  available?: boolean
  items: SxItem[]
}

type ActionKey = 'surprise' | 'social'

export function MenuDock({
  business,
  categories,
  accent = '#F47B20',
  gradient = brandGradient(),
  font,
  includeSurprise = true,
}: {
  business: any
  categories: Cat[]
  accent?: string
  gradient?: string
  font?: string
  /** Set false when the design already exposes its own surprise CTA (e.g. Design1). */
  includeSurprise?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [surpriseOpen, setSurpriseOpen] = useState(false)
  const [socialOpen, setSocialOpen] = useState(false)
  const [selected, setSelected] = useState<SxItem | null>(null)

  // Close the speed-dial on Escape for keyboard parity with the modals.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const visible = (Array.isArray(categories) ? categories : []).filter(
    (c) => c && Array.isArray(c.items) && c.items.length > 0
  )
  const availableItems = visible.flatMap((c) => c.items).filter((it) => it && it.available !== false)
  const socials = getSocials(business)

  const hasSurprise = includeSurprise && availableItems.length > 0
  const hasSocial = socials.length > 0

  const keys: ActionKey[] = [
    ...(hasSurprise ? (['surprise'] as const) : []),
    ...(hasSocial ? (['social'] as const) : []),
  ]
  if (keys.length === 0) return null

  const labels: Record<ActionKey, string> = {
    surprise: 'Plat surprise',
    social: 'Réseaux sociaux',
  }

  const trigger = (key: ActionKey) => {
    setOpen(false)
    if (key === 'surprise') setSurpriseOpen(true)
    else if (key === 'social') setSocialOpen(true)
  }

  const Icon = ({ k }: { k: ActionKey }) => {
    if (k === 'surprise')
      // eslint-disable-next-line @next/next/no-img-element
      return <img src="/icons/dice.png" alt="" className="h-5 w-5 rounded" aria-hidden="true" />
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
      </svg>
    )
  }

  const ActionPill = ({ k, dial }: { k: ActionKey; dial: boolean }) => {
    const cls = dial
      ? 'md-pop flex items-center gap-2.5 rounded-full bg-white py-1.5 pl-4 pr-1.5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.45)] ring-1 ring-black/5 transition active:scale-95'
      : 'flex items-center gap-2.5 rounded-full bg-white py-1.5 pl-4 pr-1.5 shadow-[0_14px_34px_-10px_rgba(0,0,0,0.5)] ring-1 ring-black/5 transition hover:-translate-y-0.5 active:scale-95'
    return (
      <button type="button" aria-label={labels[k]} onClick={() => trigger(k)} className={cls}>
        <span className="whitespace-nowrap text-[13px] font-bold" style={{ color: '#15110C' }}>{labels[k]}</span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundImage: gradient }}>
          <Icon k={k} />
        </span>
      </button>
    )
  }

  return (
    <>
      <style jsx global>{`
        @keyframes md-pop { from { opacity: 0; transform: translateY(8px) scale(.96) } to { opacity: 1; transform: translateY(0) scale(1) } }
        .md-pop { animation: md-pop .2s cubic-bezier(.22,1,.36,1) both }
        @media (prefers-reduced-motion: reduce) { .md-pop { animation: none !important } }
      `}</style>

      {/* Single action → one labelled FAB, no dial. */}
      {keys.length === 1 ? (
        <div className="fixed bottom-4 right-4 z-50" style={{ fontFamily: font }}>
          <ActionPill k={keys[0]} dial={false} />
        </div>
      ) : (
        <>
          {open && <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={() => setOpen(false)} aria-hidden="true" />}

          <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2.5" style={{ fontFamily: font }}>
            {open && (
              <div className="flex flex-col items-end gap-2.5">
                {keys.map((k) => (
                  <ActionPill key={k} k={k} dial />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? 'Fermer le menu' : 'Plus d’options'}
              className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_14px_34px_-8px_rgba(244,123,32,0.85)] transition hover:scale-105 active:scale-95"
              style={{ backgroundImage: gradient }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {open ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <>
                    <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
                    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
                    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
                    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </>
      )}

      {surpriseOpen && (
        <SurpriseFlow
          allItems={availableItems}
          categories={visible.map((c) => ({ id: c.id, name: c.name, items: c.items }))}
          gradient={gradient}
          font={font}
          onClose={() => setSurpriseOpen(false)}
          onView={(it) => {
            setSurpriseOpen(false)
            setSelected(it)
          }}
        />
      )}

      <SocialPopup business={business} accent={accent} open={socialOpen} onClose={() => setSocialOpen(false)} font={font} />
      <CenteredItemModal item={selected} onClose={() => setSelected(null)} gradient={gradient} font={font} />
    </>
  )
}
