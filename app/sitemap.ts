import { MetadataRoute } from 'next'
import { getActiveBusinessesCached } from '@/lib/db/business'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://scaniha.com').replace(/\/$/, '')
const OG_IMAGE = `${SITE_URL}/og-scaniha.jpg`

const marketingPages = [
  ['/', 'daily', 1],
  ['/pricing', 'weekly', 0.9],
  ['/faq', 'weekly', 0.9],
  ['/features', 'weekly', 0.8],
  ['/about', 'monthly', 0.7],
  ['/security', 'monthly', 0.6],
  ['/resources', 'weekly', 0.6],
  ['/blog', 'weekly', 0.8],
  ['/contact', 'monthly', 0.5],
  ['/developers', 'monthly', 0.5],
  ['/qr-menu-for-restaurants', 'weekly', 0.8],
  ['/digital-menu-builder', 'weekly', 0.8],
  ['/restaurant-qr-code-menu', 'weekly', 0.7],
  ['/online-menu-for-restaurants', 'weekly', 0.7],
  ['/free-qr-menu', 'weekly', 0.7],
  ['/cafe-digital-menu', 'weekly', 0.7],
] as const

const blogPosts = [
  ['how-to-create-qr-menu-for-restaurant', '2026-01-15'],
  ['benefits-of-digital-menus', '2026-01-22'],
  ['qr-code-best-practices-restaurants', '2026-02-05'],
  ['digital-menu-vs-paper-menu', '2026-02-19'],
  ['contactless-dining-future', '2026-03-01'],
] as const

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const businesses = await getActiveBusinessesCached()
  const staticPages: MetadataRoute.Sitemap = marketingPages.map(([path, changeFrequency, priority]) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency,
    priority,
    images: [OG_IMAGE],
  }))

  const comparisonPages: MetadataRoute.Sitemap = ['menulog', 'qrmenu', 'menuly', 'restomenu', 'gloriafood', 'mryum', 'finedine', 'linktree'].map((competitor) => ({
    url: `${SITE_URL}/compare/${competitor}`,
    changeFrequency: 'monthly',
    priority: 0.5,
    images: [OG_IMAGE],
  }))

  const articlePages: MetadataRoute.Sitemap = blogPosts.map(([slug, publishedAt]) => ({
    url: `${SITE_URL}/blog/${slug}`,
    lastModified: new Date(`${publishedAt}T00:00:00.000Z`),
    changeFrequency: 'monthly',
    priority: 0.6,
    images: [OG_IMAGE],
  }))

  const businessPages: MetadataRoute.Sitemap = businesses.map((business) => ({
    url: `${SITE_URL}/${business.slug}`,
    ...(business.created_at && { lastModified: new Date(business.created_at) }),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
    ...(business.logo_url && { images: [business.logo_url] }),
  }))

  return [...staticPages, ...comparisonPages, ...articlePages, ...businessPages]
}
