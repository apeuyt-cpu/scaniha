import { mockBusiness, mockCategories } from '@/lib/demo-menu'
import { getBusinessBySlug, getBusinessWithCategoriesAndItems } from '@/lib/db/business'
import PublicMenu from '@/components/menu/PublicMenu'
import GameFab from '@/components/game/GameFab'
import PoweredByScaniha from '@/components/menu/PoweredByScaniha'
import { getTheme } from '@/lib/themes'
import Design1 from '@/components/menu/designs/Design1'
import Design2 from '@/components/menu/designs/Design2'
import Design6 from '@/components/menu/designs/Design6'
import Design11 from '@/components/menu/designs/Design11'
import Design12 from '@/components/menu/designs/Design12'

const designs = {
  '1': Design1,
  '2': Design2,
  '6': Design6,
  '11': Design11,
  '12': Design12,
} as const

// Classic themes are rendered through PublicMenu (numbers 13/14/15).
const classicThemes: Record<string, string> = {
  '13': 'classic',
  '14': 'minimal',
  '15': 'dark',
}

/**
 * Preview a design with demo data, OR with a real menu's data via `?slug=...`
 * (e.g. /menu-designs/6?slug=mon-resto) — lets owners preview any design with
 * their own account's menu instead of the mock.
 */
export default async function MenuDesignPreview({
  params,
  searchParams,
}: {
  params: Promise<{ n: string }>
  searchParams: Promise<{ slug?: string }>
}) {
  const { n } = await params
  const { slug } = await searchParams

  // Default to demo data; if a slug is given, load that real business (read-only).
  let business: any = mockBusiness
  let categories: any = mockCategories
  if (slug) {
    try {
      const real = await getBusinessBySlug(slug)
      if (real) {
        const cats = (await getBusinessWithCategoriesAndItems(real.id)) || []
        const hasItems = (cats as any[]).some((c) => Array.isArray(c.items) && c.items.length > 0)
        // Only use the real menu when it actually has dishes — otherwise the
        // preview would be an empty "menu en préparation", useless for choosing.
        if (hasItems) {
          business = real
          categories = cats
        }
      }
    } catch {
      // fall back to demo data
    }
  }

  const classicId = classicThemes[n]
  if (classicId) {
    // Classic themes don't have the unified dock → keep the standalone roulette button.
    return (
      <>
        <PublicMenu business={business} categories={categories} theme={getTheme(classicId)} />
        <GameFab slug={business?.slug || ''} />
        <PoweredByScaniha />
      </>
    )
  }
  // Modern designs render their own MenuDock, but the roulette now lives on the
  // dedicated floating wheel button (GameFab) — mount it here too so every
  // design gets it. It self-detects an active game and renders nothing otherwise.
  const Comp = designs[n as keyof typeof designs] || Design1
  return (
    <>
      <Comp business={business} categories={categories} />
      <GameFab slug={business?.slug || ''} />
      <PoweredByScaniha />
    </>
  )
}
