'use client'

// Inline add-to-cart control, dropped next to each menu item's price in every
// design. Shows a compact "+ Ajouter" pill at qty 0, then a − [n] + stepper.
// Themed per design via the `accent` prop. No-ops (renders nothing) if there's
// no CartProvider above it, so it's safe to mount unconditionally in a design.

import { useCartSafe, type CartItem } from './cart-context'

type Props = {
  item: { id: string; name: string; price: number | null; available?: boolean }
  accent?: string
  /** 'sm' = tighter control for dense rows. */
  size?: 'sm' | 'md'
  className?: string
}

export default function AddToCart({ item, accent = '#F47B20', size = 'md', className = '' }: Props) {
  const cart = useCartSafe()
  if (!cart) return null
  if (item.available === false) return null

  const q = cart.qty(item.id)
  const stop = (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault() }
  const btn = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'

  if (q === 0) {
    const snap: CartItem = { id: item.id, name: item.name, price: item.price }
    return (
      <button
        type="button"
        onClick={(e) => { stop(e); cart.add(snap) }}
        aria-label={`Ajouter ${item.name}`}
        className={`inline-flex shrink-0 items-center gap-1 rounded-full ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-[13px]'} font-bold text-white shadow-sm transition active:scale-95 ${className}`}
        style={{ backgroundColor: accent }}
      >
        <svg width={size === 'sm' ? 13 : 15} height={size === 'sm' ? 13 : 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        Ajouter
      </button>
    )
  }

  return (
    <div
      onClick={stop}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full p-0.5 ${className}`}
      style={{ backgroundColor: `${accent}14` }}
    >
      <button
        type="button"
        onClick={(e) => { stop(e); cart.dec(item.id) }}
        aria-label={`Retirer ${item.name}`}
        className={`grid ${btn} place-items-center rounded-full bg-white shadow-sm transition active:scale-90`}
        style={{ color: accent }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
      </button>
      <span className="min-w-[18px] text-center text-sm font-extrabold tabular-nums" style={{ color: accent }} aria-label={`Quantité ${q}`}>{q}</span>
      <button
        type="button"
        onClick={(e) => { stop(e); cart.inc(item.id) }}
        aria-label={`Ajouter ${item.name}`}
        className={`grid ${btn} place-items-center rounded-full text-white shadow-sm transition active:scale-90`}
        style={{ backgroundColor: accent }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  )
}
