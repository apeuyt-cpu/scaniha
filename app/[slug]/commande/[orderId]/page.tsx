import { notFound } from 'next/navigation'
import { getBusinessBySlugCached } from '@/lib/db/business'
import { businessAccent } from '@/lib/db/game'
import OrderStatusView from '@/components/order/OrderStatusView'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Suivi de commande | Scaniha',
  robots: { index: false, follow: false },
}

// Standalone shareable/bookmarkable order-status page. The order id is an
// unguessable uuid; the public status endpoint returns only non-sensitive fields.
export default async function OrderStatusPage({ params }: { params: Promise<{ slug: string; orderId: string }> }) {
  const { slug, orderId } = await params
  const business = await getBusinessBySlugCached(slug).catch(() => null)
  if (!business) notFound()
  return <OrderStatusView slug={slug} orderId={orderId} businessName={business.name} accent={businessAccent(business)} />
}
