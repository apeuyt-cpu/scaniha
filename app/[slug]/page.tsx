import { notFound } from 'next/navigation'
import { getBusinessBySlug, getBusinessWithCategoriesAndItems } from '@/lib/db/business'
import { getTheme } from '@/lib/themes'
import PublicMenu from '@/components/menu/PublicMenu'
import type { Database } from '@/lib/supabase/database.types'
import type { Metadata } from 'next'

type Category = Database['public']['Tables']['categories']['Row'] & {
  items: Database['public']['Tables']['items']['Row'][]
}
export default function MenuPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const expires = Number(searchParams.get("expires"))

  useEffect(() => {
    if (!expires || Date.now() > expires) {
      router.replace("/expired")
      return
    }

    const timeout = setTimeout(() => {
      router.replace("/expired")
    }, expires - Date.now())

    // تعطيل right click
    const block = (e: Event) => e.preventDefault()
    document.addEventListener("contextmenu", block)

    return () => {
      clearTimeout(timeout)
      document.removeEventListener("contextmenu", block)
    }
  }, [expires, router])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Menu ☕</h1>
      <p>هذه اللائحة صالحة لمدة 10 دقائق فقط</p>
    </div>
  )
}


export default async function PublicMenuPage({
  params,
}: {
  params: { slug: string }
}) {
  let business
  try {
    business = await getBusinessBySlug(params.slug)
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

  // If paused or expired, still load categories but pass isPaused flag
  let categories: Category[] = []
  if (!isPaused) {
    try {
      const fetchedCategories = await getBusinessWithCategoriesAndItems(business.id)
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
    status: isPaused ? 'paused' as const : business.status
  }

  // Generate structured data for SEO
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://scaniha.com'
  const menuUrl = `${baseUrl}/${business.slug}`

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: business.name,
    url: menuUrl,
    ...(business.logo_url && { image: business.logo_url }),
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PublicMenu
        business={businessForDisplay}
        categories={categories}
        theme={theme}
      />
    </>
  )
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const business = await getBusinessBySlug(params.slug)
    if (!business) {
      return {
        title: 'Menu Not Found',
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://scaniha.com'
    const menuUrl = `${baseUrl}/${business.slug}`
    const description = `View the digital menu for ${business.name}. Browse our delicious selection of food and beverages. Order online or scan our QR code menu.`
    
    // Generate relevant keywords based on business name
    const businessKeywords = [
      `${business.name} menu`, `${business.name} قائمة`, `menu ${business.name}`,
      'QR menu', 'digital menu', 'online menu', 'restaurant menu', 'cafe menu',
      'contactless menu', 'touchless menu', 'menu QR code', 'scaniha menu',
      'قائمة رقمية', 'QR قائمة', 'منيو QR', 'قائمة المطعم'
    ]
    
    return {
      title: `${business.name} - Digital Menu | Scaniha`,
      description,
      keywords: businessKeywords,
      alternates: {
        canonical: menuUrl,
      },
      openGraph: {
        title: `${business.name} - Menu`,
        description,
        url: menuUrl,
        siteName: business.name,
        type: 'website',
        ...(business.logo_url && {
          images: [
            {
              url: business.logo_url,
              width: 1200,
              height: 630,
              alt: `${business.name} Logo`,
            },
          ],
        }),
      },
      twitter: {
        card: 'summary_large_image',
        title: `${business.name} - Menu`,
        description,
        ...(business.logo_url && {
          images: [business.logo_url],
        }),
      },
      robots: {
        index: business.status === 'active' && (!business.expires_at || new Date(business.expires_at) > new Date()),
        follow: true,
        googleBot: {
          index: business.status === 'active' && (!business.expires_at || new Date(business.expires_at) > new Date()),
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
    }
  } catch {
    return {
      title: 'Menu',
      description: 'View our menu',
    }
  }
}
