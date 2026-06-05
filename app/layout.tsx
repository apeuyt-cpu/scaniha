import type { Metadata } from 'next'
import './globals.css'
import AppProvider from '@/components/AppProvider'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://scaniha.com'),
  title: {
    default: 'Scaniha | QR Menu Builder for Restaurants & Cafés',
    template: '%s | Scaniha',
  },
  description: 'Scaniha helps restaurants and cafés create beautiful digital menus with QR codes in minutes. Easy, fast, no technical skills needed. Start for free.',
  keywords: [
    'Scaniha', 'Scaniha QR Menu', 'QR Menu Builder', 'Digital Menu for Restaurants',
    'Restaurant QR Menu', 'Scaniha Digital Menu', 'Create QR Menu', 'Online Menu for Restaurants',
    'Digital Menu Maker', 'QR Code Menu for Restaurants', 'Free QR Menu Builder',
    'Contactless Menu App', 'scaniha.com', 'digital menu', 'cafe menu', 'restaurant menu app',
    'menu QR restaurant', 'قائمة QR للمطاعم', 'menu QR', 'carte numérique restaurant'
  ],
  authors: [{ name: 'Scaniha' }],
  creator: 'Scaniha',
  publisher: 'Scaniha',
  icons: {
    icon: [
      { url: '/logo-icon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/logo-icon.png', type: 'image/png' },
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
    locale: 'en_US',
    siteName: 'Scaniha',
    title: 'Scaniha | QR Menu Builder for Restaurants & Cafés',
    description: 'Scaniha helps restaurants and cafés create beautiful digital menus with QR codes in minutes. Easy, fast, no technical skills needed. Start for free.',
    url: 'https://scaniha.com',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Scaniha - QR Menu Builder for Restaurants' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scaniha | QR Menu Builder for Restaurants & Cafés',
    description: 'Scaniha helps restaurants and cafés create beautiful digital menus with QR codes in minutes. Start for free.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://scaniha.com',
    languages: {
      en: 'https://scaniha.com/en',
      ar: 'https://scaniha.com/ar',
      fr: 'https://scaniha.com/fr',
    },
  },
}

const LOCALE_SCRIPT = `
(function() {
  var locale = localStorage.getItem('scaniha-locale');
  if (!locale) {
    var lang = (navigator.language || 'en').slice(0, 2);
    var supported = ['en', 'ar', 'fr'];
    locale = supported.includes(lang) ? lang : 'en';
  }
  var dirs = { en: 'ltr', ar: 'rtl', fr: 'ltr' };
  document.documentElement.lang = locale;
  document.documentElement.dir = dirs[locale] || 'ltr';
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
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
                { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://scaniha.com" },
                { "@type": "ListItem", "position": 2, "name": "Features", "item": "https://scaniha.com/features" },
                { "@type": "ListItem", "position": 3, "name": "Pricing", "item": "https://scaniha.com/pricing" },
                { "@type": "ListItem", "position": 4, "name": "About", "item": "https://scaniha.com/about" },
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
              "description": "QR Menu Builder for restaurants, cafes, and food businesses.",
              "sameAs": [
                "https://facebook.com/scaniha",
                "https://twitter.com/scaniha",
                "https://instagram.com/scaniha",
                "https://linkedin.com/company/scaniha"
              ],
              "founder": { "@type": "Person", "name": "Hamed Dhieb" },
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
              "description": "QR Menu Builder for restaurants, cafes, and food businesses.",
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
              "name": "Scaniha QR Menu Builder",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "description": "Create beautiful QR code menus for your restaurant, cafe, or food business.",
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
              "description": "Create beautiful QR code menus for your restaurant, cafe, or food business.",
              "url": "https://scaniha.com",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "TND",
                "description": "Free trial available. Paid plans from 150 TND.",
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "127",
                "bestRating": "5",
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
                  "name": "What is Scaniha?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Scaniha is a digital QR menu builder for restaurants, cafes, and food businesses. Create beautiful menus, generate QR codes, and share with customers instantly."
                  }
                },
                {
                  "@type": "Question",
                  "name": "How do I create a QR menu?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Sign up for free, add your menu items and categories, customize your theme, and generate a QR code. Place the QR code on tables for customers to scan."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Is Scaniha free to use?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Scaniha offers a 7-day free trial with no payment required. After the trial, choose from our 6-month, 1-year, or lifetime plans."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Do customers need to download an app?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "No. Customers simply scan the QR code with their phone camera and view the menu instantly in their browser. No app download required."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Can I update my menu in real-time?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes. All menu changes are reflected instantly. Update prices, add new items, or change categories in real-time without any delay."
                  }
                },
                {
                  "@type": "Question",
                  "name": "What languages does Scaniha support?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Scaniha supports English, Arabic, and French for both the platform interface and digital menus."
                  }
                }
              ]
            }),
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  )
}

