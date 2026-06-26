import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  alternates: { canonical: 'https://scaniha.com/features' },
  title: 'Fonctionnalités | Scaniha - Créateur de menu QR',
  description: 'Découvrez toutes les fonctionnalités du créateur de menu QR numérique Scaniha. Mises à jour en temps réel, statistiques de consultation, génération de QR codes, jeu de la roue de la chance et bien plus pour votre restaurant.',
  openGraph: {
    images: [{ url: '/og-scaniha.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'Scaniha — Créateur de menu QR pour restaurants et cafés' }], 
    title: 'Fonctionnalités | Scaniha - Créateur de menu QR',
    description: 'Des fonctionnalités puissantes pour les menus de restaurant numériques.',
    url: 'https://scaniha.com/features',
    siteName: 'Scaniha',
    type: 'website',
  },
  twitter: {
    images: ['/og-scaniha.jpg'], 
    card: 'summary_large_image',
    title: 'Fonctionnalités | Scaniha - Créateur de menu QR',
    description: 'Des fonctionnalités puissantes pour les menus de restaurant numériques.',
  },
}

const features = [
  { title: 'Créateur de menu QR', desc: 'Créez de superbes menus numériques en quelques minutes. Aucune compétence en programmation ou en design requise. Ajoutez simplement vos plats et publiez.' },
  { title: 'Génération instantanée de QR codes', desc: 'Générez instantanément des QR codes uniques pour votre menu. Imprimez-les sur des chevalets de table, des flyers ou des affiches.' },
  { title: 'Mises à jour en temps réel', desc: 'Modifiez les prix, les descriptions et les plats instantanément. Les changements s\'appliquent immédiatement — aucune mise à jour d\'application nécessaire.' },
  { title: 'Aucune application requise', desc: 'Les clients scannent et consultent votre menu directement dans leur navigateur. Aucun téléchargement, aucune contrainte.' },
  { title: 'Entièrement en français', desc: 'Une interface et des menus 100 % en français, pensés pour les cafés et restaurants tunisiens.' },
  { title: 'Plusieurs designs de menu', desc: 'Choisissez parmi 8 designs premium pour correspondre à votre identité de marque et à l\'ambiance de votre établissement.' },
  { title: 'Statistiques de consultation', desc: 'Suivez le nombre de vues de votre menu grâce au tableau de bord de statistiques intégré.' },
  { title: 'Gestion des images', desc: 'Téléversez et gérez les photos de vos plats, servies via un CDN d\'images pour un affichage rapide.' },
  { title: 'Jeu de la roue de la chance', desc: 'Fidélisez vos clients grâce à un jeu de roue de la chance intégré. Augmentez l\'interaction et les visites répétées.' },
  { title: 'Liens vers les réseaux sociaux', desc: 'Ajoutez des liens vers vos profils de réseaux sociaux directement dans votre menu numérique.' },
  { title: 'Tarif unique à vie', desc: 'Un paiement unique en dinars tunisiens, sans abonnement ni frais cachés. Vous payez une fois, c\'est à vous.' },
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FEFEFE] via-[#FEFEFE] to-[#FEFEFE]" dir="ltr">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Retour à l&apos;accueil</Link>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Tout ce dont vous avez besoin</h1>
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto">
            Scaniha met à votre disposition tous les outils pour créer, gérer et partager le menu numérique de votre restaurant.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE] hover:border-zinc-300 hover:shadow-lg transition-all">
              <h2 className="text-xl font-bold text-zinc-900 mb-3">{f.title}</h2>
              <p className="text-zinc-600">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <Link href="/business-request" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Commencer gratuitement</Link>
        </div>
      </div>
    </div>
  )
}
