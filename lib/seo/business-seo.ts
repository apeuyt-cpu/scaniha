// Resolves a business's SEO/share metadata for the public menu page.
// Owners can override title / description / share image; everything falls back
// to sensible defaults so a page is never left with broken or empty tags.
//
// Storage: reuses the existing `businesses.design_settings` JSONB column under a
// reserved `seo` key — NO database migration needed.
//   design_settings.seo = { metaTitle, metaDescription, shareImage }

export interface BusinessSeoInput {
  name?: string | null
  logo_url?: string | null
  theme_id?: string | null
  design_settings?: any
}

export interface BusinessSeo {
  /** <title> */
  title: string
  /** Open Graph / Twitter title (shorter, no "| Scaniha" suffix) */
  ogTitle: string
  /** Meta + OG description */
  description: string
  /** OG/Twitter share image URL (or null → no image tag) */
  shareImage: string | null
  /** Meta keywords */
  keywords: string[]
}

function clean(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

export function getBusinessSeo(business: BusinessSeoInput): BusinessSeo {
  const name = clean(business?.name) || 'Notre établissement'
  const ds = business?.design_settings && typeof business.design_settings === 'object' ? business.design_settings : {}
  const seo = (ds.seo && typeof ds.seo === 'object' ? ds.seo : {}) as Record<string, unknown>

  // Softer description fallback: the active design's owner-written tagline, if any.
  const activeTagline = business?.theme_id ? clean(ds?.[business.theme_id]?.tagline) : null

  const metaTitle = clean(seo.metaTitle)
  const title = metaTitle || `${name} - Menu numérique | Scaniha`
  const ogTitle = metaTitle || `${name} - Menu`

  const description =
    clean(seo.metaDescription) ||
    activeTagline ||
    `Découvrez le menu numérique de ${name}. Parcourez notre sélection de plats et de boissons, et commandez en scannant le code QR.`

  const shareImage = clean(seo.shareImage) || clean(business?.logo_url) || null

  const keywords = [
    `menu ${name}`,
    `${name} menu`,
    `carte ${name}`,
    'menu QR',
    'menu numérique',
    'menu en ligne',
    'menu restaurant',
    'menu café',
    'menu sans contact',
    'carte numérique',
    'menu code QR',
    'menu scaniha',
  ]

  return { title, ogTitle, description, shareImage, keywords }
}
