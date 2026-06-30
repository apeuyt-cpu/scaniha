import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  alternates: { canonical: 'https://scaniha.com/about' },
  title: 'À propos | Scaniha - Créateur de menu QR',
  description: 'Découvrez Scaniha, le créateur de menu QR numérique pour les restaurants et les cafés. Fondé par Rakiza Group, dirigé par son PDG Hamed, pour transformer l\'expérience en restaurant.',
  openGraph: {
    images: [{ url: '/og-scaniha.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'Scaniha — Créateur de menu QR pour restaurants et cafés' }], 
    title: 'À propos | Scaniha - Créateur de menu QR',
    description: 'Transformer les menus de restaurant grâce à la technologie QR.',
    url: 'https://scaniha.com/about',
    siteName: 'Scaniha',
    type: 'website',
  },
  twitter: {
    images: ['/og-scaniha.jpg'], 
    card: 'summary_large_image',
    title: 'À propos | Scaniha - Créateur de menu QR',
    description: 'Transformer les menus de restaurant grâce à la technologie QR.',
  },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FEFEFE] via-[#FEFEFE] to-[#FEFEFE]" dir="ltr">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Retour à l&apos;accueil</Link>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-6">À propos de Scaniha</h1>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Notre mission</h2>
          <p className="text-zinc-600 leading-relaxed mb-4">
            Scaniha a été créé pour transformer la façon dont les restaurants, cafés et commerces de restauration présentent leurs menus à leurs clients.
            Nous croyons que chaque restaurant mérite un menu numérique élégant et fonctionnel qui enrichit l&apos;expérience des convives.
          </p>
          <p className="text-zinc-600 leading-relaxed">
            Notre plateforme supprime le besoin de menus imprimés, réduit les points de contact et offre des mises à jour en temps réel
            qui maintiennent votre menu exact et attrayant.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Pourquoi Scaniha ?</h2>
          <ul className="space-y-3 text-zinc-600">
            <li className="flex items-start gap-2"><span className="text-orange-600 font-bold">•</span> Conçu pour la restauration — chaque fonctionnalité répond aux besoins des cafés et restaurants</li>
            <li className="flex items-start gap-2"><span className="text-orange-600 font-bold">•</span> Entièrement en français, pensé pour les établissements tunisiens</li>
            <li className="flex items-start gap-2"><span className="text-orange-600 font-bold">•</span> Aucune application requise — fonctionne sur tout appareil doté d&apos;un appareil photo</li>
            <li className="flex items-start gap-2"><span className="text-orange-600 font-bold">•</span> Des mises à jour instantanées qui s&apos;appliquent en temps réel</li>
            <li className="flex items-start gap-2"><span className="text-orange-600 font-bold">•</span> Un tarif unique à vie en dinars, sans abonnement ni frais cachés</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Notre histoire</h2>
          <p className="text-zinc-600 leading-relaxed">
            Fondé par Rakiza Group et dirigé par son PDG Hamed, Scaniha est né d&apos;un constat simple : les restaurants avaient besoin d&apos;une meilleure façon de partager
            leurs menus. Les menus imprimés étaient coûteux à mettre à jour, difficiles à maintenir exacts et généraient un gaspillage inutile.
            Scaniha a été conçu pour résoudre ces problèmes grâce à une solution de menu QR simple et puissante.
          </p>
        </section>

        <div className="text-center mt-12">
          <Link href="/business-request" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Démarrer votre essai gratuit</Link>
        </div>
      </div>
    </div>
  )
}
