import { notFound } from 'next/navigation'
import { getBusinessBySlugCached, getMenuCached } from '@/lib/db/business'
import { menuImageUrl } from '@/lib/image-url'
import { getBusinessSeo } from '@/lib/seo/business-seo'
import { getTheme } from '@/lib/themes'
import PublicMenu from '@/components/menu/PublicMenu'
import PoweredByScaniha from '@/components/menu/PoweredByScaniha'
import FidelityHub from '@/components/game/FidelityHub'
import { businessAccent, businessGradient } from '@/lib/db/game'
import { resolveMode, fidelityLanding } from '@/lib/design-settings'
import LogView from '@/components/LogView'
import QrScanMint from '@/components/game/QrScanMint'
import type { Database } from '@/lib/supabase/database.types'
import type { Metadata, Viewport } from 'next'



type Category = Database['public']['Tables']['categories']['Row'] & {
  items: Database['public']['Tables']['items']['Row'][]
}



export default async function PublicMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  let business
  try {
    business = await getBusinessBySlugCached(slug)
  } catch (error) {
    console.error('Error fetching business:', error)
    notFound()
  }
  
  if (!business) {
    notFound()
  }

  // Check if business is expired or paused
  // If expired, treat it as paused for display purposes
  let isPaused = business.status === 'paused'
  
  if (business.expires_at && business.status === 'active') {
    const now = new Date()
    const expiry = new Date(business.expires_at)
    
    if (expiry < now) {
      // Business has expired - treat as paused for public display
      // But don't update status here (let super admin or cron handle it)
      isPaused = true
    }
  }

  // Fidelity-only mode: the QR scan lands on the loyalty hub, not a menu.
  // (Skips menu loading + menu SEO entirely; legacy cafés never hit this.)
  if (!isPaused && resolveMode(business) === 'fidelity') {
    return (
      <>
        <FidelityHub
          slug={business.slug}
          businessName={business.name}
          accent={businessAccent(business)}
          gradient={businessGradient(business)}
          defaultTab={fidelityLanding(business)}
        />
        <LogView businessId={business.id} slug={business.slug} />
        {/* Mints the QR scan-session cookie when opened via `/{slug}?s=<key>`. */}
        <QrScanMint slug={business.slug} />
      </>
    )
  }

  // If paused or expired, still load categories but pass isPaused flag
  let categories: Category[] = []
  if (!isPaused) {
    try {
      const fetchedCategories = await getMenuCached(business.id, slug)
      categories = (fetchedCategories as Category[]) || []
    } catch (error) {
      console.error('Error loading categories:', error)
      categories = []
    }
  }

  const theme = getTheme(business.theme_id, business.primary_color)

  // Create a business object with modified status for display
  const businessForDisplay = {
    ...business,
    status: isPaused ? 'paused' as const : business.status,
    // Logo is shown small (≤140px) in the menu header — serve it resized.
    logo_url: menuImageUrl(business.logo_url, 240),
  }

  // Generate structured data for SEO
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://scaniha.com'
  const menuUrl = `${baseUrl}/${business.slug}`
  const seo = getBusinessSeo(business)

  // Social profiles → schema.org sameAs (top-level business columns).
  const sameAs = [business.facebook_url, business.instagram_url, business.twitter_url, business.website_url].filter(Boolean) as string[]
  // Contact info lives in the active design's settings (address / phone).
  const contact = (business.design_settings && typeof business.design_settings === 'object'
    ? (business.design_settings as any)[business.theme_id]
    : null) || {}

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: business.name,
    description: seo.description,
    url: menuUrl,
    ...(seo.shareImage && { image: seo.shareImage }),
    ...(typeof contact.phone === 'string' && contact.phone.trim() && { telephone: contact.phone.trim() }),
    ...(typeof contact.address === 'string' && contact.address.trim() && { address: contact.address.trim() }),
    ...(sameAs.length > 0 && { sameAs }),
    ...(categories.length > 0 && {
      hasMenu: {
        '@type': 'Menu',
        hasMenuSection: categories.map(cat => ({
          '@type': 'MenuSection',
          name: cat.name,
          hasMenuItem: cat.items.map(item => ({
            '@type': 'MenuItem',
            name: item.name,
            description: item.description || undefined,
            offers: item.price ? {
              '@type': 'Offer',
              price: item.price,
              priceCurrency: 'TND',
            } : undefined,
          })),
        })),
      },
    }),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          // Escape so owner-controlled fields can't break out of the <script>
          // block (</script> injection) — stored XSS on every menu visitor.
          __html: JSON.stringify(structuredData)
            .replace(/</g, '\\u003c')
            .replace(/>/g, '\\u003e')
            .replace(/&/g, '\\u0026')
            .replace(/\u2028/g, '\\u2028')
            .replace(/\u2029/g, '\\u2029'),
        }}
      />
      <PublicMenu
        business={businessForDisplay}
        categories={categories}
        theme={theme}
      />
      {/* Menu is a standalone product now — it never links to fidelity/roulette.
          The loyalty hub + roulette live at /{slug}/fidelite (its own QR). */}
      {!isPaused && <PoweredByScaniha />}
      <LogView businessId={business.id} slug={business.slug} />
      {/* Mints the QR scan-session cookie when opened via `/{slug}?s=<key>`. */}
      <QrScanMint slug={business.slug} />
    </>
  )
}

// Per-café browser chrome: the phone's address-bar tint matches the café's own
// brand colour instead of the platform orange (app/layout.tsx). Reuses the cached
// business fetch, so no extra DB read. Falls back to the root themeColor on error.
export async function generateViewport({ params }: { params: Promise<{ slug: string }> }): Promise<Viewport> {
  try {
    const { slug } = await params
    const business = await getBusinessBySlugCached(slug)
    if (!business) return {}
    return { themeColor: businessAccent(business) }
  } catch {
    return {}
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://scaniha.com'
  try {
    const { slug } = await params
    const business = await getBusinessBySlugCached(slug)
    if (!business) {
      return {
        metadataBase: new URL(baseUrl),
        title: { absolute: 'Menu introuvable | Scaniha' },
        description: "Ce menu est introuvable ou n'est plus disponible.",
        robots: { index: false, follow: false },
      }
    }

    // Fidelity-only café: the home is the loyalty hub, not a menu.
    if (resolveMode(business) === 'fidelity') {
      return {
        metadataBase: new URL(baseUrl),
        title: { absolute: `Fidélité — ${business.name} | Scaniha` },
        description: `Programme fidélité ${business.name} : tournez la roue, cumulez des points et échangez-les contre des récompenses.`,
        alternates: { canonical: `${baseUrl}/${business.slug}` },
        robots: { index: false, follow: false },
      }
    }

    const seo = getBusinessSeo(business)
    const menuUrl = `${baseUrl}/${business.slug}`
    const isLive = business.status === 'active' && (!business.expires_at || new Date(business.expires_at) > new Date())
    const ogImages = seo.shareImage ? [{ url: seo.shareImage, width: 1200, height: 630, alt: business.name }] : []

    return {
      metadataBase: new URL(baseUrl),
      // absolute → bypass the root layout's "%s | Scaniha" template (seo.title
      // already carries the brand for the default, or the owner's exact title).
      title: { absolute: seo.title },
      description: seo.description,
      keywords: seo.keywords,
      alternates: { canonical: menuUrl },
      icons: business.logo_url
        ? { icon: business.logo_url, apple: business.logo_url }
        : { icon: '/logo.png', apple: '/logo.png' },
      openGraph: {
        title: seo.ogTitle,
        description: seo.description,
        url: menuUrl,
        siteName: business.name,
        type: 'website',
        images: ogImages,
      },
      twitter: {
        card: 'summary_large_image',
        title: seo.ogTitle,
        description: seo.description,
        images: seo.shareImage ? [seo.shareImage] : [],
      },
      robots: {
        index: isLive,
        follow: true,
        googleBot: {
          index: isLive,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
    }
  } catch {
    return {
      metadataBase: new URL(baseUrl),
      title: { absolute: 'Menu | Scaniha' },
      description: 'Consultez notre menu numérique.',
    }
  }
}
