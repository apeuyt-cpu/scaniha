import type { Metadata } from 'next'
import './globals.css'
import AppProvider from '@/components/AppProvider'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://scaniha.com'),
  title: {
    default: 'Scaniha - QR Menu Builder | Digital Restaurant Menus',
    template: '%s | Scaniha',
  },
  description: 'Create beautiful QR code menus for your restaurant, cafe, or food business. Free digital menu builder with QR code generation. Perfect for restaurants, cafes, bars, and food trucks.',
  keywords: [
    'QR menu', 'QR code menu', 'digital menu', 'online menu', 'restaurant menu', 'cafe menu', 'menu builder',
    'QR code generator', 'contactless menu', 'touchless menu', 'digital restaurant menu', 'menu QR code',
    'restaurant QR code', 'cafe QR code', 'food menu QR', 'menu scanner', 'QR menu maker',
    'scaniha', 'scaniha.com', 'menu digital', 'قائمة رقمية', 'QR قائمة', 'منيو QR', 'قائمة المطعم',
    'restaurant technology', 'food service technology', 'restaurant digitalization', 'menu management',
    'free menu builder', 'restaurant menu app', 'menu creator', 'QR menu solution'
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
    title: 'Scaniha - QR Menu Builder | Digital Restaurant Menus',
    description: 'Create beautiful QR code menus for your restaurant, cafe, or food business. Free digital menu builder.',
    url: 'https://scaniha.com',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Scaniha - QR Menu Builder' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scaniha - QR Menu Builder | Digital Restaurant Menus',
    description: 'Create beautiful QR code menus for your restaurant, cafe, or food business.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://scaniha.com',
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
              "@type": "Organization",
              "name": "Scaniha",
              "url": "https://scaniha.com",
              "logo": "https://scaniha.com/logo.png",
              "description": "QR Menu Builder for restaurants, cafes, and food businesses.",
              "sameAs": [],
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

