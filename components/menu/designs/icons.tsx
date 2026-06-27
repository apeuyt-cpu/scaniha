// Shared food line-icons + a branded no-photo placeholder.
// Every design uses these so an item/category without a photo renders a tasteful,
// on-brand tile (brand-tinted panel + thin line icon) instead of an empty box.

import type { CSSProperties, ReactNode } from 'react'

export type FoodKind =
  | 'pizza'
  | 'pasta'
  | 'salad'
  | 'cup'
  | 'coffee'
  | 'dessert'
  | 'burger'
  | 'sandwich'
  | 'utensils'

/**
 * Guess the best icon from one or more hint strings (item name, category name…).
 * The first hint that matches wins; falls back to a fork/knife glyph.
 */
export function pickFoodIcon(...hints: (string | null | undefined)[]): FoodKind {
  const text = hints.filter(Boolean).join(' ').toLowerCase()
  const has = (...needles: string[]) => needles.some((n) => text.includes(n))

  if (has('pizza', 'margherita', 'pepperoni', 'calzone')) return 'pizza'
  if (has('burger', 'cheeseburger')) return 'burger'
  if (has('sandwich', 'panini', 'wrap', 'tacos', 'club')) return 'sandwich'
  if (has('pât', 'pat', 'pasta', 'spaghetti', 'alfredo', 'truffle', 'truffe', 'nouille', 'lasagne', 'penne', 'tagliatelle', 'risotto'))
    return 'pasta'
  if (has('salad', 'salade', 'césar', 'cesar', 'crudité', 'crudite', 'bowl')) return 'salad'
  if (has('café', 'cafe', 'coffee', 'espresso', 'cappuccino', 'latte', 'moka', 'mocha', 'thé', 'the ', 'tea', 'chocolat chaud'))
    return 'coffee'
  if (has('boisson', 'jus', 'juice', 'limonade', 'soda', 'smoothie', 'eau', 'cocktail', 'frais', 'frappé', 'frappe', 'milkshake', 'shake'))
    return 'cup'
  if (has('dessert', 'tiramisu', 'gâteau', 'gateau', 'cake', 'glace', 'crème', 'creme', 'sucr', 'pâtiss', 'patiss', 'tarte', 'crêpe', 'crepe', 'cookie', 'brownie', 'flan'))
    return 'dessert'
  return 'utensils'
}

const PATHS: Record<FoodKind, ReactNode> = {
  pizza: (
    <>
      <path d="M3 7l9-3 9 3-9 14z" />
      <path d="M3 7l9 3 9-3" />
      <circle cx="10" cy="9" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="11" cy="14" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  pasta: (
    <>
      <path d="M4 11h16" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M8 11c0-3 1-6 2-7M12 11c0-3 .5-6 1-7M16 11c0-3-1-6-2-7" />
      <path d="M3 20h18" />
    </>
  ),
  salad: (
    <>
      <path d="M4 11h16a8 8 0 0 1-16 0z" />
      <path d="M12 11c-1.5-2-1-5 1.5-6.5M12 11c1.5-1.5 4-1.5 6 .5M12 11c-2-1-4.5-.5-6 1.5" />
      <path d="M9 18.5h6" />
    </>
  ),
  cup: (
    <>
      <path d="M6 4h12l-1.5 16h-9z" />
      <path d="M6.4 8h11.2" />
      <path d="M13 2.5l-1 5.5" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
      <path d="M17 9h2.2a2.3 2.3 0 0 1 0 4.6H17" />
      <path d="M8 2.5c-.6 1 .6 1.8 0 2.8M12 2.5c-.6 1 .6 1.8 0 2.8" />
    </>
  ),
  dessert: (
    <>
      <path d="M6 10h12l-1 9H7z" />
      <path d="M6 10a6 6 0 0 1 12 0" />
      <path d="M12 4.2V2.5" />
      <circle cx="12" cy="4" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  burger: (
    <>
      <path d="M4 9a8 8 0 0 1 16 0z" />
      <path d="M4 13h16" />
      <path d="M4.5 16.5h15a2.5 2.5 0 0 1-2.5 2.5H7a2.5 2.5 0 0 1-2.5-2.5z" />
    </>
  ),
  sandwich: (
    <>
      <path d="M3 18l9-13 9 13z" />
      <path d="M6.5 13h11" />
      <path d="M3 18h18" />
    </>
  ),
  utensils: (
    <>
      <path d="M7 3v18" />
      <path d="M5 3v5a2 2 0 0 0 4 0V3" />
      <path d="M16 3c-1.5 0-2.5 1.8-2.5 4.5S14.5 12 16 12s2.5-1.8 2.5-4.5S17.5 3 16 3z" />
      <path d="M16 12v9" />
    </>
  ),
}

/** A single line-icon. Color follows `currentColor` (or pass `style`). */
export function FoodIcon({
  kind,
  hint,
  className,
  style,
  strokeWidth = 1.6,
}: {
  /** Explicit icon kind. If omitted, derived from `hint`. */
  kind?: FoodKind
  /** Hint string(s) used to pick an icon when `kind` is not given. */
  hint?: string | null
  className?: string
  style?: CSSProperties
  strokeWidth?: number
}) {
  const resolved = kind ?? pickFoodIcon(hint)
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {PATHS[resolved]}
    </svg>
  )
}
