import LoyaltyClient from '@/components/loyalty/LoyaltyClient'

export const dynamic = 'force-dynamic'

export default async function LoyaltyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <LoyaltyClient slug={slug} />
    </div>
  )
}
