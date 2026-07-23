import type { Metadata, Viewport } from 'next'
import './globals.css'
import AppProvider from '@/components/AppProvider'
import NoDownloadGuard from '@/components/NoDownloadGuard'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://scaniha.com'),
  title: {
    default: 'Scaniha | Digital QR Menu for Restaurants & Cafes',
    template: '%s | Scaniha',
  },
  description: 'Scaniha is the global QR menu platform for restaurants — créez un menu QR numérique élégant pour votre restaurant ou café en quelques minutes, sans application ni compétences techniques. Essai gratuit.',
  keywords: [
    'Scaniha', 'scaniha', 'scaniha menu', 'scaniha app', 'scaniha.com',
    'QR menu maker', 'digital menu software', 'free qr menu',
    'menu QR', 'créateur de menu QR', 'menu numérique restaurant',
    'menu QR restaurant', 'carte numérique restaurant', 'créer un menu QR', 'menu en ligne restaurant',
    'menu numérique café', 'QR code menu restaurant', 'menu QR gratuit',
    'menu sans contact', 'menu numérique', 'menu café', 'application menu restaurant',
    'carte numérique café', 'menu digital', 'menu QR', 'QR code restaurant',
    'carte QR restaurant', 'menu restaurant', 'salon de thé menu QR', 'food truck menu QR'
  ],
  applicationName: 'Scaniha',
  authors: [{ name: 'Scaniha', url: 'https://scaniha.com' }],
  creator: 'Scaniha',
  publisher: 'Scaniha',
  category: 'technology',
  // Favicon / touch icons come from the app/icon.png + app/apple-icon.png file
  // conventions; the web manifest link is auto-injected from app/manifest.ts.
  // (Client menu pages override the favicon with their own logo via their
  // generateMetadata `icons` — so a café tab shows the café's logo, not ours.)
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
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Scaniha',
    title: 'Scaniha | Digital QR Menu for Restaurants & Cafes',
    description: 'Scaniha is the global QR menu platform for restaurants — menu QR numérique pour restaurants et cafés, sans application. Essai gratuit.',
    url: 'https://scaniha.com',
    images: [{ url: '/og-scaniha.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'Scaniha — the digital QR menu platform for restaurants' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scaniha | Digital QR Menu for Restaurants & Cafes',
    description: 'Scaniha is the global QR menu platform for restaurants — menu QR numérique pour restaurants et cafés, sans application. Essai gratuit.',
    images: ['/og-scaniha.jpg'],
  },
  alternates: {
    canonical: 'https://scaniha.com',
    languages: {
      fr: 'https://scaniha.com',
    },
  },
}

// Pinch-zoom is allowed (accessibility / Lighthouse) — we keep iOS from
// auto-zooming on focus by sizing inputs at ≥16px rather than locking the scale.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F47B20',
}

const LOCALE_SCRIPT = `
(function() {
  document.documentElement.lang = 'fr';
  document.documentElement.dir = 'ltr';
  try { localStorage.setItem('scaniha-locale', 'fr'); } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOCALE_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Scaniha's brand entity graph (Organization/Brand/Product/FAQ…) is NOT
            global — it lives only on the marketing homepage (<ScanihaJsonLd/>),
            so client menu pages carry their OWN Restaurant data, not ours. */}
      </head>
      <body suppressHydrationWarning>
        <NoDownloadGuard />
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  )
}
