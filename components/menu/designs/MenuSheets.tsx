'use client'

import { useId, useRef } from 'react'
// Shared overlay behaviour (Escape + body-scroll lock + focus trap/restore) so
// these sheets behave identically to the centered modals in interactive.tsx.
import { useOverlayDismiss } from './interactive'

export type SheetItem = {
  id: string | number
  name: string
  description: string | null
  price: number | null
  image_url: string | null
  available?: boolean
}

function fmt(price: number | null): string {
  if (price == null || isNaN(Number(price))) return '—'
  return `${Number(price).toFixed(2)} TND`
}

/** Full item detail as a bottom sheet. Themeable via `accent`. */
export function ItemDetailModal({
  item,
  accent = '#F97316',
  onClose,
}: {
  item: SheetItem | null
  accent?: string
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const titleId = useId()
  useOverlayDismiss(!!item, onClose, dialogRef)
  if (!item) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white pb-8 shadow-2xl outline-none sm:max-w-lg sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex justify-center bg-white pt-3 pb-2 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-zinc-300" />
        </div>
        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={item.name} className="h-52 w-full object-cover sm:rounded-t-3xl" />
        )}
        <div className="px-5 pt-4">
          <div className="flex items-start justify-between gap-3">
            <h3 id={titleId} className="text-xl font-bold text-zinc-900">{item.name}</h3>
            <span
              className="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-sm font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              {fmt(item.price)}
            </span>
          </div>
          {item.description && (
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">{item.description}</p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-xl py-3 text-sm font-semibold text-white transition active:scale-[0.99]"
            style={{ backgroundColor: accent }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
