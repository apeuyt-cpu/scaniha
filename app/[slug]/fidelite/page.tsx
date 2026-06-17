import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getBusinessBySlugCached } from '@/lib/db/business'
import { businessAccent, businessGradient } from '@/lib/db/game'
import { isFidelityLive, resolveMode } from '@/lib/design-settings'
import FidelityHub from '@/components/game/FidelityHub'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const business = await getBusinessBySlugCached(slug).catch(() => null)
  const name = business?.name || 'Fidélité'
  return {
    title: { absolute: `Fidélité — ${name} | Scaniha` },
    description: `Programme fidélité ${name} : tournez la roue, cumulez des points et échangez-les contre des récompenses.`,
    // Personal loyalty hub — private, never indexed.
    robots: { index: false, follow: false },
  }
}

export default async function FidelitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const business = await getBusinessBySlugCached(slug).catch(() => null)
  if (!business) notFound()
  // Fidelity system off → no hub; send them back to the menu.
  if (!isFidelityLive(business)) redirect(`/${business.slug}`)

  const accent = businessAccent(business)
  const gradient = businessGradient(business)
  // 'both' cafés keep a Menu tab back to the QR menu; fidelity-only ones don't.
  const hasMenu = resolveMode(business) === 'both'
  return (
    <div className="min-h-screen bg-white">
      <FidelityHub slug={business.slug} businessName={business.name} accent={accent} gradient={gradient} hasMenu={hasMenu} />
    </div>
  )
}
