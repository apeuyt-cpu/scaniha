import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getBusinessBySlugCached } from '@/lib/db/business'
import { isFidelityLive } from '@/lib/design-settings'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const business = await getBusinessBySlugCached(slug).catch(() => null)
  const name = business?.name || 'Mon compte'
  return {
    title: { absolute: `Mon compte — ${name} | Scaniha` },
    description: `Votre compte fidélité chez ${name} : points, bons gagnés et récompenses.`,
    robots: { index: false, follow: false },
  }
}

// The standalone profile page was merged into the unified fidelity hub
// ("Ma carte" tab). Keep the route as a redirect so old links still work.
export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const business = await getBusinessBySlugCached(slug).catch(() => null)
  if (!business) notFound()
  if (!isFidelityLive(business)) redirect(`/${business.slug}`)
  redirect(`/${business.slug}/fidelite`)
}
