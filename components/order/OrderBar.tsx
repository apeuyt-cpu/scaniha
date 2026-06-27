'use client'

// Sticky bottom bar. Appears the instant the cart has items (or an order is in
// flight) and opens the CheckoutSheet. This replaces the old floating
// "Commander" button — the diner adds from the menu itself, the bar just
// summarises + opens checkout.

import { useCart, money } from './cart-context'
import { ORDER_STATUS_CUSTOMER, isOrderActive } from '@/lib/orders'

export default function OrderBar({ accent = '#F47B20' }: { accent?: string }) {
  const { count, total, order, open, setOpen } = useCart()

  // Hidden while the sheet is open, and when there's nothing to show.
  if (open) return null
  const activeOrder = order && isOrderActive(order.status)
  if (!activeOrder && count === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] pt-2 pointer-events-none">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto mx-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl px-5 py-3.5 text-[15px] font-bold text-white shadow-[0_18px_44px_-14px_rgba(0,0,0,0.6)] transition active:scale-[0.99]"
        style={{ backgroundColor: accent }}
      >
        {activeOrder ? (
          <>
            <span className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white/25 text-sm" aria-hidden="true">🛎️</span>
              Suivi commande
            </span>
            <span className="truncate text-sm font-semibold opacity-95">{ORDER_STATUS_CUSTOMER[order!.status]}</span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-2">
              <span className="grid h-6 min-w-[24px] place-items-center rounded-full bg-white/25 px-1.5 text-xs font-extrabold tabular-nums">{count}</span>
              Voir ma commande
            </span>
            <span className="tabular-nums">{money(total)}</span>
          </>
        )}
      </button>
    </div>
  )
}
