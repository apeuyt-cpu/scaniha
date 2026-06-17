import type { Metadata, Viewport } from 'next'
import './globals.css'
import AppProvider from '@/components/AppProvider'
import NoDownloadGuard from '@/components/NoDownloadGuard'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://scaniha.com'),
  title: {
    default: 'Scaniha | Créateur de menu QR pour restaurants et cafés',
    template: '%s | Scaniha',
  },
  description: 'Scaniha, l’application tunisienne de menu QR : créez un menu numérique élégant pour votre restaurant ou café en quelques minutes, sans application ni compétences techniques. Essai gratuit.',
  keywords: [
    'Scaniha', 'scaniha', 'Scaniha Tunisie', 'scaniha menu', 'scaniha app', 'scaniha.com',
    'menu QR', 'créateur de menu QR', 'menu numérique restaurant',
    'menu QR restaurant', 'carte numérique restaurant', 'créer un menu QR', 'menu en ligne restaurant',
    'menu numérique café', 'QR code menu restaurant', 'menu QR gratuit',
    'menu sans contact', 'menu numérique', 'menu café', 'application menu restaurant',
    'carte numérique café', 'menu digital Tunisie', 'menu QR Tunisie', 'QR code restaurant Tunisie',
    'menu sans contact Tunisie', 'carte QR restaurant', 'menu restaurant Tunisie',
    'salon de thé menu QR', 'food truck menu QR', 'menu digital café Tunisie'
  ],
  applicationName: 'Scaniha',
  authors: [{ name: 'Scaniha', url: 'https://scaniha.com' }],
  creator: 'Scaniha',
  publisher: 'Scaniha',
  category: 'technology',
  // Favicon / touch icons come from the app/icon.png + app/apple-icon.png file
  // conventions; the web manifest link is auto-injected from app/manifest.ts.
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
    title: 'Scaniha | Créateur de menu QR pour restaurants et cafés',
    description: 'Scaniha, l’application tunisienne de menu QR : créez un menu numérique élégant pour votre restaurant ou café en quelques minutes, sans application. Essai gratuit.',
    url: 'https://scaniha.com',
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
        {/* NOTE: a site-wide BreadcrumbList was removed — a fixed Accueil→…→À
            propos trail on every page is incorrect. Breadcrumbs are emitted
            per-page where the trail is real. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": "https://scaniha.com/#organization",
              "name": "Scaniha",
              "legalName": "Scaniha",
              "alternateName": ["Scaniha Tunisie", "Scaniha Menu QR", "Scaniha QR Menu"],
              "url": "https://scaniha.com",
              "logo": {
                "@type": "ImageObject",
                "url": "https://scaniha.com/logo.png",
                "width": 412,
                "height": 371,
              },
              "image": "https://scaniha.com/og-scaniha.jpg",
              "slogan": "Votre menu QR, en un scan",
              "description": "Créateur de menu QR pour restaurants, cafés et commerces alimentaires.",
              "disambiguatingDescription": "Scaniha est une application web tunisienne de création de menus QR (QR code) et de cartes numériques pour les restaurants, cafés et commerces alimentaires. Éditée par Rakiza Group.",
              "knowsLanguage": "fr",
              "email": "support@scaniha.com",
              "telephone": "+216 51 089 100",
              "founder": { "@type": "Organization", "name": "Rakiza Group", "url": "https://rakiza.group" },
              "parentOrganization": { "@type": "Organization", "name": "Rakiza Group", "url": "https://rakiza.group" },
              "employee": { "@type": "Person", "name": "Hamed", "jobTitle": "PDG" },
              "areaServed": { "@type": "Country", "name": "Tunisie" },
              "knowsAbout": [
                "menu QR", "menu numérique", "carte de restaurant numérique", "QR code restaurant",
                "menu sans contact", "menu en ligne", "digitalisation de la restauration",
                "fidélité restaurant", "menu lumineux", "carte digitale café"
              ],
              "address": { "@type": "PostalAddress", "addressCountry": "TN" },
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer support",
                "email": "support@scaniha.com",
                "telephone": "+216 51 089 100",
                "areaServed": "TN",
                "availableLanguage": ["French"],
              },
              // Verified brand profiles — strong entity signal that "Scaniha" is a
              // distinct brand (not "Scania"); Google + AI engines read these.
              "sameAs": [
                "https://www.instagram.com/scaniha.co/",
                "https://www.facebook.com/61587286774228",
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Brand",
              "name": "Scaniha",
              "url": "https://scaniha.com",
              "description": "Créateur de menu QR pour restaurants, cafés et commerces alimentaires.",
              "logo": "https://scaniha.com/logo.png",
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              "name": "Scaniha - Créateur de menu QR",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "description": "Créez de superbes menus QR code pour votre restaurant, café ou commerce alimentaire.",
              "url": "https://scaniha.com",
              "brand": { "@type": "Brand", "name": "Scaniha" },
              "offers": {
                "@type": "AggregateOffer",
                "priceCurrency": "TND",
                "lowPrice": "0",
                "highPrice": "300",
                "offerCount": "3",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Scaniha",
              "operatingSystem": "Web",
              "applicationCategory": "BusinessApplication",
              "description": "Créez de superbes menus QR code pour votre restaurant, café ou commerce alimentaire.",
              "url": "https://scaniha.com",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "TND",
                "description": "Essai gratuit disponible. Menu QR à partir de 100 TND ; programme de fidélité à partir de 15 TND/mois.",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": "https://scaniha.com/#website",
              "name": "Scaniha",
              "alternateName": ["Scaniha Tunisie", "Scaniha Menu QR"],
              "url": "https://scaniha.com",
              "inLanguage": "fr",
              "publisher": { "@id": "https://scaniha.com/#organization" },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "Qu'est-ce que Scaniha ?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Scaniha est un créateur de menu QR numérique pour les restaurants, cafés et commerces alimentaires. Créez de superbes menus, générez des QR codes et partagez-les instantanément avec vos clients."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Comment créer un menu QR ?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Inscrivez-vous gratuitement, ajoutez vos articles et catégories, personnalisez votre thème et générez un QR code. Placez le QR code sur les tables pour que les clients le scannent."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Scaniha est-il gratuit ?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Scaniha propose un essai gratuit de 7 jours sans paiement requis. Après l'essai, choisissez parmi nos forfaits de 6 mois, 1 an ou à vie."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Les clients doivent-ils télécharger une application ?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Non. Les clients scannent simplement le QR code avec l'appareil photo de leur téléphone et consultent le menu instantanément dans leur navigateur. Aucun téléchargement requis."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Puis-je mettre à jour mon menu en temps réel ?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Oui. Toutes les modifications du menu sont répercutées instantanément. Mettez à jour les prix, ajoutez de nouveaux articles ou modifiez les catégories en temps réel, sans aucun délai."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Quelle langue Scaniha prend-il en charge ?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Scaniha est entièrement en français, pour l'interface de la plateforme comme pour les menus numériques."
                  }
                }
              ]
            }),
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <NoDownloadGuard />
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  )
}
