import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getBusinessBySlug } from '@/lib/db/business'
import { businessAccent } from '@/lib/db/game'
import ProfileClient from '@/components/menu/ProfileClient'
import BottomNav from '@/components/menu/BottomNav'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const business = await getBusinessBySlug(slug).catch(() => null)
  const name = business?.name || 'Mon compte'
  return {
    title: { absolute: `Mon compte — ${name} | Scaniha` },
    description: `Votre compte fidélité chez ${name} : points, bons gagnés et récompenses.`,
    // Diner account — private, never indexed.
    robots: { index: false, follow: false },
  }
}

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let business
  try {
    business = await getBusinessBySlug(slug)
  } catch {
    notFound()
  }
  if (!business) notFound()

  const accent = businessAccent(business)
  return (
    <>
      <ProfileClient slug={business.slug} businessName={business.name} />
      <BottomNav slug={business.slug} accent={accent} active="profile" />
    </>
  )
}
