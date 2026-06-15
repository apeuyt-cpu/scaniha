import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Blog Scaniha | Conseils menu QR & Guide de digitalisation des restaurants',
  description: 'Apprenez à créer des menus QR numériques pour votre restaurant. Conseils, bonnes pratiques et guides sur les menus à code QR, la restauration sans contact et la technologie en restauration.',
  openGraph: {
    images: [{ url: '/og-scaniha.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'Scaniha — Créateur de menu QR pour restaurants et cafés' }],  title: 'Blog Scaniha | Conseils menu QR & Guide de digitalisation des restaurants', description: 'Apprenez à créer des menus QR numériques. Conseils sur les menus à code QR et la restauration sans contact.', url: 'https://scaniha.com/blog', siteName: 'Scaniha', type: 'website' },
  twitter: {
    images: ['/og-scaniha.jpg'],  card: 'summary_large_image', title: 'Blog Scaniha | Conseils menu QR', description: 'Apprenez à créer des menus QR numériques pour votre restaurant.' },
  alternates: { canonical: 'https://scaniha.com/blog' },
}

const posts = [
  { title: 'Comment créer un menu QR pour votre restaurant — Guide étape par étape', desc: 'Apprenez à créer un menu QR pour votre restaurant en quelques minutes. De l’inscription à l’impression des codes QR, ce guide couvre tout.', slug: 'how-to-create-qr-menu-for-restaurant', date: '2026-01-15' },
  { title: '7 avantages des menus numériques pour les restaurants en 2026', desc: 'Découvrez pourquoi les restaurants passent aux menus numériques. Économies, mises à jour en temps réel, analyses et meilleure expérience client.', slug: 'benefits-of-digital-menus', date: '2026-01-22' },
  { title: 'Bonnes pratiques du code QR pour les restaurants — Maximisez les scans', desc: 'Découvrez les bonnes pratiques du code QR pour les restaurants. Où placer les codes QR, comment les promouvoir et comment augmenter l’engagement client.', slug: 'qr-code-best-practices-restaurants', date: '2026-02-05' },
  { title: 'Menu numérique ou menu papier — Pourquoi le numérique l’emporte', desc: 'Comparez les menus numériques et les menus papier pour les restaurants. Analyse des coûts, impact environnemental, flexibilité et satisfaction client.', slug: 'digital-menu-vs-paper-menu', date: '2026-02-19' },
  { title: 'L’avenir de la restauration sans contact — Tendances pour 2026', desc: 'Explorez l’avenir de la restauration sans contact. Menus QR, commande mobile et tendances de transformation numérique qui façonnent le secteur de la restauration.', slug: 'contactless-dining-future', date: '2026-03-01' },
]

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#FEFEFE]" dir="ltr">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Retour à Scaniha</Link>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Blog Scaniha</h1>
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto">Conseils, guides et analyses sur les menus QR, la digitalisation des restaurants et la restauration sans contact.</p>
        </div>
        <div className="space-y-8">
          {posts.map((p, i) => (
            <article key={i} className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE] hover:border-orange-200 hover:shadow-lg transition-all">
              <time className="text-sm text-zinc-500">{p.date}</time>
              <h2 className="text-2xl font-bold text-zinc-900 mt-2 mb-3">{p.title}</h2>
              <p className="text-zinc-600 mb-4">{p.desc}</p>
              <Link href={`/blog/${p.slug}`} className="text-orange-600 font-semibold hover:text-orange-700">Lire la suite →</Link>
            </article>
          ))}
        </div>
        <div className="text-center mt-16">
          <Link href="/signup" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Créez votre menu QR gratuitement</Link>
        </div>
      </div>
    </div>
  )
}
