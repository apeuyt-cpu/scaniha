'use client'

// Shared interactive pieces used by the menu templates:
//  - InteractiveStyles : global keyframes (prefix `sx-`)
//  - useOverlayDismiss : Escape-to-close + scroll-lock + focus trap for overlays
//  - CenteredItemModal : clean centered detail popup with a floating ✕
// Themeable via a CSS gradient + ink/muted colors so each design keeps its look.

import { useEffect, useId, useRef, useState } from 'react'

export type SxItem = {
  id: string | number
  name: string
  description: string | null
  price: number | null
  image_url: string | null
  available?: boolean
}
export type SxCategory = { id: string | number; name: string; items: SxItem[] }

function fmt(p: number | null): string {
  return p == null || isNaN(Number(p)) ? '—' : `${Number(p).toFixed(2)} TND`
}

export function InteractiveStyles() {
  return (
    <style jsx global>{`
      @keyframes sx-fade { from { opacity: 0 } to { opacity: 1 } }
      @keyframes sx-pop { 0% { opacity: 0; transform: scale(.9) translateY(10px) } 55% { opacity: 1; transform: scale(1.02) translateY(0) } 100% { transform: scale(1) } }
      @keyframes sx-stagger { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
      .sx-backdrop { animation: sx-fade .22s ease forwards }
      .sx-modal { animation: sx-pop .32s cubic-bezier(.34,1.56,.64,1) forwards }
      .sx-stagger { opacity: 0; animation: sx-stagger .3s cubic-bezier(.22,1,.36,1) forwards }
      @media (prefers-reduced-motion: reduce) {
        .sx-backdrop,.sx-modal,.sx-stagger { animation: none !important; opacity: 1 !important; transform: none !important }
      }
    `}</style>
  )
}

interface Theme {
  gradient: string
  ink?: string
  muted?: string
  softBg?: string
  softText?: string
  font?: string
}

/**
 * Close on Escape + lock body scroll + manage focus while an overlay is open.
 *
 * When a `dialogRef` is given the hook also:
 *  - moves focus into the dialog on open (so SR/keyboard users land inside),
 *  - traps Tab/Shift+Tab within the dialog (no tabbing to content behind the
 *    backdrop),
 *  - restores focus to the previously-focused element on close.
 */
export function useOverlayDismiss(
  open: boolean,
  onClose: () => void,
  dialogRef?: React.RefObject<HTMLElement | null>
) {
  const cb = useRef(onClose)
  cb.current = onClose
  useEffect(() => {
    if (!open) return
    const dialog = dialogRef?.current ?? null
    const prevFocused = (document.activeElement as HTMLElement | null) ?? null

    const focusables = () =>
      dialog
        ? Array.from(
            dialog.querySelectorAll<HTMLElement>(
              'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
            )
          ).filter((el) => el.offsetParent !== null || el === document.activeElement)
        : []

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cb.current()
        return
      }
      if (e.key === 'Tab' && dialog) {
        const els = focusables()
        if (els.length === 0) {
          e.preventDefault()
          dialog.focus()
          return
        }
        const first = els[0]
        const last = els[els.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (e.shiftKey) {
          if (active === first || !dialog.contains(active)) {
            e.preventDefault()
            last.focus()
          }
        } else if (active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Move focus into the dialog (first focusable, else the dialog itself).
    if (dialog) {
      const els = focusables()
      ;(els[0] ?? dialog).focus()
    }

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      if (prevFocused && typeof prevFocused.focus === 'function') prevFocused.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
}

/** Clean centered detail modal with a floating ✕. */
export function CenteredItemModal({ item, onClose, gradient, ink = '#171210', muted = '#857C72', font }: { item: SxItem | null; onClose: () => void } & Theme) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const titleId = useId()
  useOverlayDismiss(!!item, onClose, dialogRef)
  if (!item) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ fontFamily: font }}>
      <div className="sx-backdrop absolute inset-0 bg-black/45 backdrop-blur-[3px]" onClick={onClose} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="sx-modal relative w-full max-w-sm overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] outline-none">
        <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow backdrop-blur transition hover:bg-white active:scale-90">
          <CloseIcon />
        </button>
        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={item.name} className="h-56 w-full object-cover" />
        )}
        {/* No image → no empty placeholder; just text + details (extra top room so
            the floating ✕ doesn't collide with the title/price). */}
        <div className={`px-6 pb-7 ${item.image_url ? 'pt-5' : 'pt-14'}`}>
          <div className="flex items-start justify-between gap-3">
            <h3 id={titleId} className="text-[22px] font-bold leading-tight" style={{ color: ink }}>{item.name}</h3>
            <span className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-bold text-white" style={{ backgroundImage: gradient }}>{fmt(item.price)}</span>
          </div>
          {item.description && <p className="mt-3 text-[14px] leading-relaxed" style={{ color: muted }}>{item.description}</p>}
          <button type="button" onClick={onClose} className="mt-6 w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition active:scale-[0.99]" style={{ backgroundImage: gradient }}>Fermer</button>
        </div>
      </div>
    </div>
  )
}

function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
