import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import LandingPage from '@/components/landing/LandingPage'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Scaniha | QR Menu Builder for Restaurants & Cafés',
  description: 'Scaniha helps restaurants and cafés create beautiful digital menus with QR codes in minutes. Easy, fast, no technical skills needed. Start for free.',
  keywords: [
    'Scaniha', 'QR Menu Builder', 'Digital Menu for Restaurants', 'Restaurant QR Menu',
    'Scaniha QR Menu', 'Create QR Menu', 'Online Menu for Restaurants', 'Digital Menu Maker',
    'QR Code Menu for Restaurants', 'Free QR Menu Builder', 'Contactless Menu App',
    'restaurant menu app', 'digital menu café', 'menu QR restaurant', 'قائمة QR للمطاعم',
    'digital menu', 'cafe menu', 'menu builder'
  ],
  openGraph: {
    title: 'Scaniha | QR Menu Builder for Restaurants & Cafés',
    description: 'Scaniha helps restaurants and cafés create beautiful digital menus with QR codes in minutes. Easy, fast, no technical skills needed. Start for free.',
    type: 'website',
    url: 'https://scaniha.com',
    siteName: 'Scaniha',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scaniha | QR Menu Builder for Restaurants & Cafés',
    description: 'Scaniha helps restaurants and cafés create beautiful digital menus with QR codes in minutes. Start for free.',
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

  if (profile) {
    // Default to admin dashboard - middleware will redirect super_admins if needed
    redirect('/admin')
  }

  return <LandingPage />
}
