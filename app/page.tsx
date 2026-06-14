import { getCurrentProfile, getDashboardUrl } from '@/lib/auth'
import LandingPage from '@/components/landing/LandingPage'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Scaniha | Créateur de menu QR pour restaurants et cafés',
  description: 'Scaniha aide les restaurants et cafés à créer de superbes menus numériques avec QR code en quelques minutes. Simple, rapide, sans compétences techniques. Commencez gratuitement.',
  keywords: [
    'Scaniha', 'créateur de menu QR', 'menu numérique restaurant', 'menu QR restaurant',
    'menu QR', 'créer un menu QR', 'menu en ligne restaurant', 'créateur de menu numérique',
    'QR code menu restaurant', 'menu QR gratuit', 'menu sans contact',
    'application menu restaurant', 'menu numérique café', 'carte numérique restaurant',
    'menu numérique', 'menu café', 'créateur de menu'
  ],
  openGraph: {
    title: 'Scaniha | Créateur de menu QR pour restaurants et cafés',
    description: 'Scaniha aide les restaurants et cafés à créer de superbes menus numériques avec QR code en quelques minutes. Simple, rapide, sans compétences techniques. Commencez gratuitement.',
    type: 'website',
    url: 'https://scaniha.com',
    siteName: 'Scaniha',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scaniha | Créateur de menu QR pour restaurants et cafés',
    description: 'Scaniha aide les restaurants et cafés à créer de superbes menus numériques avec QR code en quelques minutes. Commencez gratuitement.',
  },
  alternates: {
    canonical: 'https://scaniha.com',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default async function Home() {
  const profile = await getCurrentProfile()
  // Logged-in users CAN view the landing page now — we no longer redirect them.
  // Their CTAs just point to the right dashboard instead of Connexion / Inscription.
  const role = (profile as any)?.role as 'owner' | 'super_admin' | null | undefined
  const dashboardUrl = role ? getDashboardUrl(role) : null

  return <LandingPage dashboardUrl={dashboardUrl} />
}
