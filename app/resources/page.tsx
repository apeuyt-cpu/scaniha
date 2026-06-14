import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  alternates: { canonical: 'https://scaniha.com/resources' },
  title: 'Ressources | Scaniha - Guide du créateur de menu QR',
  description: 'Apprenez à créer et à optimiser votre menu QR numérique. Guides, conseils et bonnes pratiques pour les menus numériques de restaurant.',
  openGraph: {
    title: 'Ressources | Scaniha - Guide du menu QR',
    description: 'Guides et bonnes pratiques pour les menus de restaurant numériques.',
    url: 'https://scaniha.com/resources',
    siteName: 'Scaniha',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ressources | Scaniha - Guide du menu QR',
    description: 'Guides et bonnes pratiques pour les menus de restaurant numériques.',
  },
}

const articles = [
  { title: 'Comment créer un menu QR pour votre restaurant', desc: 'Guide étape par étape pour créer votre premier menu QR numérique. De la configuration à la publication en quelques minutes.' },
  { title: 'Les avantages des menus numériques pour les restaurants', desc: 'Pourquoi les restaurants adoptent les menus numériques. Économies, flexibilité et meilleure expérience client.' },
  { title: 'Bonnes pratiques des QR codes pour les restaurants', desc: 'Conseils pour placer et promouvoir votre menu QR. Maximisez les scans et l\'engagement des clients.' },
  { title: 'Guide du menu multilingue', desc: 'Comment créer des menus en plusieurs langues. Servez une clientèle variée en français, anglais et arabe.' },
  { title: 'Conseils de conception de menu pour de meilleures ventes', desc: 'Optimisez la mise en page et les prix de votre menu pour augmenter le panier moyen et la satisfaction client.' },
  { title: 'Guide des statistiques de menu numérique', desc: 'Suivez les vues du menu, les plats populaires et le comportement des clients. Prenez des décisions éclairées pour votre menu.' },
]

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-[#FEFEFE]" dir="ltr">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Retour à l&apos;accueil</Link>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Ressources et guides</h1>
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto">Apprenez tout sur les menus QR numériques pour votre restaurant ou café.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((a, i) => (
            <article key={i} className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE] hover:border-orange-200 hover:shadow-lg transition-all">
              <h2 className="text-xl font-bold text-zinc-900 mb-3">{a.title}</h2>
              <p className="text-zinc-600 mb-4">{a.desc}</p>
              <Link href="/signup" className="text-orange-600 font-semibold hover:text-orange-700 text-sm">En savoir plus →</Link>
            </article>
          ))}
        </div>

        <div className="text-center mt-16">
          <Link href="/signup" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Commencer gratuitement</Link>
        </div>
      </div>
    </div>
  )
}
