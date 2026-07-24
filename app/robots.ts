import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://scaniha.com'

  const privatePaths = [
    '/admin/', '/super-admin/', '/api/', '/login', '/signup', '/forgot-password',
    '/welcome', '/portefeuille', '/menu/', '/menu-designs/', '/upload-demo/',
    '/*/commande/', '/*/fidelite', '/*/jeu', '/*/profil',
  ]

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
      { userAgent: '*', allow: '/', disallow: privatePaths },
      // Explicitly welcome AI search crawlers while preserving the same private
      // boundaries as conventional crawlers.
      { userAgent: aiCrawlers, allow: '/', disallow: privatePaths },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
