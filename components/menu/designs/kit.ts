// Tiny shared helpers for the menu design templates.

/**
 * Scaniha brand palette — a warm orange→amber gradient.
 * Use these so every template reinforces the same identity instead of drifting
 * into off-brand greens/teals/pastels.
 */
export const BRAND = {
  orange: '#F47B20',
  amber: '#F5B82E',
  /** Slightly darker orange for text that needs AA contrast on light surfaces. */
  orangeDeep: '#E06A12',
}

/** `linear-gradient(...)` string for the brand orange→amber sweep. */
export function brandGradient(deg = 135): string {
  return `linear-gradient(${deg}deg, ${BRAND.orange}, ${BRAND.amber})`
}

export type KitItem = {
  id: string | number
  name: string
  description: string | null
  price: number | null
  image_url: string | null
  available?: boolean
}

export type KitCategory = {
  id: string | number
  name: string
  image_url: string | null
  available?: boolean
  items: KitItem[]
}

export function fmt(price: number | null): string {
  if (price == null || isNaN(Number(price))) return '—'
  return `${Number(price).toFixed(2)} TND`
}

/** Available categories with their kept items (sold-out kept when showSoldOut). */
export function normalizeCats(categories: any[], showSoldOut = false): KitCategory[] {
  return (Array.isArray(categories) ? categories : [])
    .filter((c) => c && c.available !== false)
    .map((c) => ({
      ...c,
      items: (Array.isArray(c.items) ? c.items : []).filter(
        (it: KitItem) => it && (showSoldOut || it.available !== false)
      ),
    }))
    .filter((c) => c.items.length > 0)
}

export function searchItems<T extends KitItem>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter(
    (it) => it.name?.toLowerCase().includes(q) || (it.description ? it.description.toLowerCase().includes(q) : false)
  )
}
