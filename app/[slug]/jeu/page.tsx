import GameClient from '@/components/game/GameClient'

export const dynamic = 'force-dynamic'

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <GameClient slug={slug} />
    </div>
  )
}
