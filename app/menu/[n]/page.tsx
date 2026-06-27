import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { mockBusiness, mockCategories } from '@/lib/demo-menu'
import { getBusinessBySlug, getBusinessWithCategoriesAndItems } from '@/lib/db/business'
import PoweredByScaniha from '@/components/menu/PoweredByScaniha'
import Design1 from '@/components/menu/designs/Design1'
import Design6 from '@/components/menu/designs/Design6'
import Design11 from '@/components/menu/designs/Design11'
import Design12 from '@/components/menu/designs/Design12'

// The 4 modern designs, in the same order as the owner's picker — addressed by
// clean, sequential numbers (1·2·3·4) so the links are easy to send all at once.
const DESIGNS = {
  '1': { Comp: Design1, themeId: 'design1', label: 'Spécial du Jour' },
  '2': { Comp: Design6, themeId: 'design6', label: 'Liste Élégante' },
  '3': { Comp: Design11, themeId: 'design11', label: 'Vitrine Immersive' },
  '4': { Comp: Design12, themeId: 'design12', label: 'Terroir' },
} as const

type N = keyof typeof DESIGNS

/**
 * Shareable design preview: /menu/1 … /menu/4 — the same menu rendered in each
 * of the 4 designs, so a prospect can compare and pick one.
 * Uses the polished "Saveur" demo by default; pass `?slug=<café>` to preview a
 * real café's own menu in that design instead.
 */
export default async function MenuDesignLink({
  params,
  searchParams,
}: {
  params: Promise<{ n: string }>
  searchParams: Promise<{ slug?: string }>
}) {
  const { n } = await params
  const entry = DESIGNS[n as N]
  if (!entry) notFound()
  const { slug } = await searchParams

  // Default to the demo; with `?slug=`, load that real business (read-only),
  // but only if it actually has dishes — otherwise the preview would be empty.
  let business: any = { ...mockBusiness, theme_id: entry.themeId }
  let categories: any = mockCategories
  if (slug) {
    try {
      const real = await getBusinessBySlug(slug)
      if (real) {
        const cats = (await getBusinessWithCategoriesAndItems(real.id)) || []
        const hasItems = (cats as any[]).some((c) => Array.isArray(c.items) && c.items.length > 0)
        if (hasItems) {
          business = { ...real, theme_id: entry.themeId }
          categories = cats
        }
      }
    } catch {
      // fall back to the demo
    }
  }

  const Comp = entry.Comp
  return (
    <>
      <Comp business={business} categories={categories} />
      <PoweredByScaniha />
    </>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> {
  const { n } = await params
  const entry = DESIGNS[n as N]
  return {
    title: entry ? `Design ${n} — ${entry.label}` : 'Aperçu du menu',
    robots: { index: false, follow: false },
  }
}
