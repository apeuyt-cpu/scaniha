import { getCurrentProfile, getDashboardUrl } from '@/lib/auth'
import LandingPage from '@/components/landing/LandingPage'
import ScanihaJsonLd from '@/components/seo/ScanihaJsonLd'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Scaniha | Créateur de menu QR pour restaurants et cafés',
  description: 'Scaniha, l’application tunisienne de menu QR : créez un menu numérique élégant pour votre restaurant ou café en quelques minutes, sans application ni compétences techniques. Essai gratuit.',
  keywords: [
    'Scaniha', 'scaniha', 'Scaniha Tunisie', 'scaniha menu', 'scaniha app',
    'créateur de menu QR', 'menu numérique restaurant', 'menu QR restaurant',
    'menu QR', 'créer un menu QR', 'menu en ligne restaurant', 'créateur de menu numérique',
    'QR code menu restaurant', 'menu QR gratuit', 'menu sans contact',
    'application menu restaurant', 'menu numérique café', 'carte numérique restaurant',
    'menu numérique', 'menu café', 'créateur de menu', 'menu QR Tunisie',
    'QR code restaurant Tunisie', 'menu restaurant Tunisie', 'menu sans contact Tunisie'
  ],
  openGraph: {
    title: 'Scaniha | Créateur de menu QR pour restaurants et cafés',
    description: 'Scaniha, l’application tunisienne de menu QR : créez un menu numérique élégant pour votre restaurant ou café en quelques minutes, sans application. Essai gratuit.',
    type: 'website',
    url: 'https://scaniha.com',
    siteName: 'Scaniha',
    images: [{ url: '/og-scaniha.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'Scaniha — Le menu QR numérique pour restaurants et cafés en Tunisie' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scaniha | Créateur de menu QR pour restaurants et cafés',
    description: 'Scaniha, l’application tunisienne de menu QR : créez un menu numérique élégant pour votre restaurant ou café en quelques minutes. Essai gratuit.',
    images: ['/og-scaniha.jpg'],
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

  return (
    <>
      <ScanihaJsonLd />
      <LandingPage dashboardUrl={dashboardUrl} />
    </>
  )
}
