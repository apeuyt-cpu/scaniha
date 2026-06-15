import { redirect, notFound } from 'next/navigation'
import { getBusinessBySlugCached } from '@/lib/db/business'
import { isFidelityEnabled } from '@/lib/design-settings'
import GameClient from '@/components/game/GameClient'

export const dynamic = 'force-dynamic'

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const business = await getBusinessBySlugCached(slug).catch(() => null)
  if (!business) notFound()
  // Fidelity system off → no game; send them back to the menu.
  if (!isFidelityEnabled(business)) redirect(`/${slug}`)
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <GameClient slug={slug} />
    </div>
  )
}
