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
          '/gallery',
          '/compare/',
        ],
        disallow: ['/admin/', '/super-admin/', '/api/', '/upload-demo/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

