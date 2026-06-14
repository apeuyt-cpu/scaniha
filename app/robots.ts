import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://scaniha.com'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/pricing',
          '/features',
          '/about',
          '/security',
          '/resources',
          '/compare/',
          '/qr-menu-for-restaurants',
          '/digital-menu-builder',
          '/restaurant-qr-code-menu',
          '/online-menu-for-restaurants',
          '/free-qr-menu',
          '/cafe-digital-menu',
          '/blog',
          '/contact',
        ],
        disallow: ['/admin/', '/super-admin/', '/api/', '/gallery', '/upload-demo/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

