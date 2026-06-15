import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'L’avenir de la restauration sans contact — Tendances pour 2026 | Scaniha',
  description: 'Explorez l’avenir de la restauration sans contact en 2026. Tendances des menus QR, commande mobile, transformation numérique des restaurants et attentes des clients.',
  openGraph: {
    images: [{ url: '/og-scaniha.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'Scaniha — Créateur de menu QR pour restaurants et cafés' }],  title: 'L’avenir de la restauration sans contact — Tendances pour 2026', description: 'Explorez l’avenir de la restauration sans contact et les tendances des menus QR.', url: 'https://scaniha.com/blog/contactless-dining-future', siteName: 'Scaniha', type: 'article' },
  twitter: {
    images: ['/og-scaniha.jpg'],  card: 'summary_large_image', title: 'L’avenir de la restauration sans contact — Tendances pour 2026', description: 'Explorez l’avenir de la restauration sans contact et les tendances des menus QR.' },
  alternates: { canonical: 'https://scaniha.com/blog/contactless-dining-future' },
}

export default function Post() {
  return (
    <div className="min-h-screen bg-[#FEFEFE]" dir="ltr">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/blog" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Retour au blog</Link>
        <article>
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-4">L’avenir de la restauration sans contact — Tendances pour 2026</h1>
          <time className="text-zinc-500 mb-8 block">1er mars 2026</time>
          <div className="prose prose-lg max-w-none text-zinc-700 space-y-6">
            <p>La restauration sans contact n’est plus une tendance — c’est devenu la norme. Voici les principales tendances qui façonnent la technologie en restauration en 2026.</p>
            <h2 className="text-2xl font-bold text-zinc-900 mt-8">1. Les menus QR sont désormais la norme</h2>
            <p>Plus de 70 % des restaurants proposent aujourd’hui des menus QR. Les clients s’attendent à scanner un code QR et à consulter le menu sur leur téléphone. C’est plus rapide, plus sûr et plus pratique.</p>
            <h2 className="text-2xl font-bold text-zinc-900 mt-8">2. L’intégration de la commande mobile</h2>
            <p>Les restaurants intègrent leurs menus QR à des systèmes de commande mobile. Les clients peuvent scanner, parcourir le menu et passer commande depuis leur téléphone, sans attendre.</p>
            <h2 className="text-2xl font-bold text-zinc-900 mt-8">3. Les menus numériques multilingues</h2>
            <p>Avec le retour des voyages internationaux, les restaurants ont besoin de menus en plusieurs langues. Les menus numériques facilitent l’accueil d’une clientèle variée.</p>
            <h2 className="text-2xl font-bold text-zinc-900 mt-8">4. L’optimisation du menu basée sur les données</h2>
            <p>Les menus numériques fournissent des analyses sur les articles les plus consultés. Les restaurants exploitent ces données pour optimiser leurs prix, l’agencement du menu et la gestion des stocks.</p>
            <h2 className="text-2xl font-bold text-zinc-900 mt-8">5. Des pratiques durables</h2>
            <p>Les clients soucieux de l’environnement privilégient les restaurants qui réduisent le gaspillage. Les menus numériques éliminent le gaspillage de papier et favorisent une restauration durable.</p>
            <div className="bg-orange-50 p-6 rounded-2xl mt-8"><Link href="/signup" className="inline-block px-8 py-4 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-bold shadow-lg">Préparez l’avenir de votre restaurant gratuitement</Link></div>
            <p>À lire aussi : <Link href="/blog/digital-menu-vs-paper-menu" className="text-orange-600">Menu numérique ou menu papier</Link> · <Link href="/features" className="text-orange-600">Fonctionnalités de Scaniha</Link></p>
          </div>
        </article>
      </div>
    </div>
  )
}
