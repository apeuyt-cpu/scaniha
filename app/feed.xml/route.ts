import { NextResponse } from 'next/server'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://scaniha.com').replace(/\/$/, '')

const posts = [
  ['how-to-create-qr-menu-for-restaurant', 'Comment créer un menu QR pour votre restaurant — Guide étape par étape', 'Un guide pratique pour créer, publier et imprimer un menu QR pour votre restaurant.', '2026-01-15'],
  ['benefits-of-digital-menus', '7 avantages des menus numériques pour les restaurants en 2026', 'Les avantages opérationnels des menus numériques pour les restaurants.', '2026-01-22'],
  ['qr-code-best-practices-restaurants', 'Bonnes pratiques du code QR pour les restaurants', 'Conseils de placement, de lisibilité et de test pour les codes QR de restaurant.', '2026-02-05'],
  ['digital-menu-vs-paper-menu', 'Menu numérique ou menu papier', 'Une comparaison factuelle entre menus papier et numériques.', '2026-02-19'],
  ['contactless-dining-future', 'L’avenir de la restauration sans contact', 'Les tendances des menus QR et de la commande mobile en restauration.', '2026-03-01'],
] as const

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character]!)
}

export function GET() {
  const items = posts.map(([slug, title, description, publishedAt]) => {
    const url = `${siteUrl}/blog/${slug}`
    return `<item><title>${escapeXml(title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><description>${escapeXml(description)}</description><pubDate>${new Date(`${publishedAt}T00:00:00.000Z`).toUTCString()}</pubDate></item>`
  }).join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Blog Scaniha</title><link>${siteUrl}/blog</link><description>Guides pratiques sur les menus QR et la digitalisation des restaurants.</description><language>fr-TN</language><lastBuildDate>${new Date('2026-03-01T00:00:00.000Z').toUTCString()}</lastBuildDate>${items}</channel></rss>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
