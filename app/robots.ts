import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://scaniha.com'

  const publicPaths = [
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
    '/llms.txt',
  ]
  const sensitive = ['/admin/', '/super-admin/', '/api/', '/upload-demo/']

  // Generative-engine / AI crawlers — explicitly WELCOMED so Scaniha can be found
  // and cited by ChatGPT, Perplexity, Claude, Gemini, Copilot, etc. (GEO).
  const aiCrawlers = [
    'GPTBot', 'ChatGPT-User', 'OAI-SearchBot', // OpenAI / ChatGPT
    'ClaudeBot', 'anthropic-ai', 'Claude-Web', // Anthropic / Claude
    'PerplexityBot', 'Perplexity-User',        // Perplexity
    'Google-Extended',                          // Google Gemini / AI Overviews grounding
    'Applebot-Extended',                        // Apple Intelligence
    'Amazonbot', 'cohere-ai', 'DuckAssistBot', 'CCBot', // Misc + Common Crawl
  ]

  return {
    rules: [
      { userAgent: '*', allow: publicPaths, disallow: sensitive },
      // Let AI engines read everything public (full site), not just the list above.
      { userAgent: aiCrawlers, allow: '/', disallow: sensitive },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
