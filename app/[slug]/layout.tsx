import { getBusinessBySlug } from '@/lib/db/business'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const business = await getBusinessBySlug(params.slug)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://scaniha.com'

    if (!business) {
      return {
        title: 'Menu Not Found | Scaniha',
        description: 'This menu could not be found or is no longer available.',
        robots: { index: false, follow: false },
      }
    }

    const title = `${business.name} | Digital Menu | Scaniha`
    const description = `Browse the digital menu of ${business.name}. View our offerings, prices, and more. Scan the QR code to explore.`

    return {
      title,
      description,
      metadataBase: new URL(baseUrl),
      alternates: { canonical: `${baseUrl}/${business.slug}` },
      openGraph: {
        title: `${business.name} - Digital Menu`,
        description,
        url: `${baseUrl}/${business.slug}`,
        siteName: 'Scaniha',
        type: 'website',
        images: business.logo_url ? [{ url: business.logo_url, width: 800, height: 600, alt: business.name }] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${business.name} - Digital Menu`,
        description,
      },
      icons: business.logo_url ? {
        icon: business.logo_url,
        apple: business.logo_url,
      } : {
        icon: '/logo-icon.png',
        apple: '/logo-icon.png',
      },
    }
  } catch {
    return {
      title: 'Menu | Scaniha',
      description: 'Digital menu powered by Scaniha.',
    }
  }
}

export default function MenuLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

