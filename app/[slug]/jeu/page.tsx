import { redirect, notFound } from 'next/navigation'
import { getBusinessBySlugCached } from '@/lib/db/business'
import { isFidelityLive } from '@/lib/design-settings'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

// The standalone game page was merged into the unified fidelity hub. Keep the
// route as a redirect so old links / printed QRs still work.
export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const business = await getBusinessBySlugCached(slug).catch(() => null)
  if (!business) notFound()
  if (!isFidelityLive(business)) redirect(`/${business.slug}`)
  redirect(`/${business.slug}/fidelite?t=roue`)
}
