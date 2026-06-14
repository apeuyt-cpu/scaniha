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
  description: 'Scaniha aide les restaurants et cafés à créer de superbes menus numériques avec QR code en quelques minutes. Simple, rapide, sans compétences techniques. Commencez gratuitement.',
  keywords: [
    'Scaniha', 'menu QR', 'créateur de menu QR', 'menu numérique restaurant',
    'menu QR restaurant', 'carte numérique restaurant', 'créer un menu QR', 'menu en ligne restaurant',
    'menu numérique café', 'QR code menu restaurant', 'menu QR gratuit',
    'menu sans contact', 'scaniha.com', 'menu numérique', 'menu café', 'application menu restaurant',
    'carte numérique café', 'menu digital Tunisie'
  ],
  authors: [{ name: 'Scaniha' }],
  creator: 'Scaniha',
  publisher: 'Scaniha',
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: [
      { url: '/logo.png', type: 'image/png' },
    ],
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
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Scaniha',
    title: 'Scaniha | Créateur de menu QR pour restaurants et cafés',
    description: 'Scaniha aide les restaurants et cafés à créer de superbes menus numériques avec QR code en quelques minutes. Simple, rapide, sans compétences techniques. Commencez gratuitement.',
    url: 'https://scaniha.com',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Scaniha - Créateur de menu QR pour restaurants' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scaniha | Créateur de menu QR pour restaurants et cafés',
    description: 'Scaniha aide les restaurants et cafés à créer de superbes menus numériques avec QR code en quelques minutes. Commencez gratuitement.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://scaniha.com',
    languages: {
      fr: 'https://scaniha.com',
    },
  },
}

// Lock the scale so mobile Safari/Chrome never auto-zooms when an input smaller
// than 16px gains focus (the qty box, search bars, the caisse amount, etc.).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://scaniha.com" },
                { "@type": "ListItem", "position": 2, "name": "Fonctionnalités", "item": "https://scaniha.com/features" },
                { "@type": "ListItem", "position": 3, "name": "Tarifs", "item": "https://scaniha.com/pricing" },
                { "@type": "ListItem", "position": 4, "name": "À propos", "item": "https://scaniha.com/about" },
              ]
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Scaniha",
              "url": "https://scaniha.com",
              "logo": "https://scaniha.com/logo.png",
              "description": "Créateur de menu QR pour restaurants, cafés et commerces alimentaires.",
              "sameAs": [
                "https://facebook.com/scaniha",
                "https://twitter.com/scaniha",
                "https://instagram.com/scaniha",
                "https://linkedin.com/company/scaniha"
              ],
              "founder": { "@type": "Organization", "name": "Rakiza Group", "url": "https://rakiza.group" },
              "parentOrganization": { "@type": "Organization", "name": "Rakiza Group", "url": "https://rakiza.group" },
              "employee": { "@type": "Person", "name": "Hamed", "jobTitle": "PDG" },
              "address": { "@type": "PostalAddress", "addressCountry": "TN" },
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
                "highPrice": "600",
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
                "description": "Essai gratuit disponible. Forfaits payants à partir de 150 TND.",
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
              "name": "Scaniha",
              "url": "https://scaniha.com",
              "inLanguage": "fr",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://scaniha.com/?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
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
