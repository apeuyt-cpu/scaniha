import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Comment créer un menu QR pour votre restaurant | Guide étape par étape | Scaniha',
  description: 'Apprenez à créer un menu QR pour votre restaurant étape par étape. De l’inscription à l’impression des codes QR, ce guide complet vous accompagne à chaque étape.',
  openGraph: {
    images: [{ url: '/og-scaniha.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'Scaniha — Créateur de menu QR pour restaurants et cafés' }],  title: 'Comment créer un menu QR pour votre restaurant | Guide étape par étape', description: 'Apprenez à créer un menu QR pour votre restaurant étape par étape.', url: 'https://scaniha.com/blog/how-to-create-qr-menu-for-restaurant', siteName: 'Scaniha', type: 'article' },
  twitter: {
    images: ['/og-scaniha.jpg'],  card: 'summary_large_image', title: 'Comment créer un menu QR pour votre restaurant', description: 'Apprenez à créer un menu QR pour votre restaurant étape par étape.' },
  alternates: { canonical: 'https://scaniha.com/blog/how-to-create-qr-menu-for-restaurant' },
}

export default function Post() {
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: 'Comment créer un menu QR pour votre restaurant — Guide étape par étape',
    description: 'Apprenez à créer un menu QR pour votre restaurant étape par étape. De l’inscription à l’impression des codes QR, ce guide complet vous accompagne à chaque étape.',
    image: 'https://scaniha.com/og-scaniha.jpg',
    datePublished: '2026-01-15T00:00:00+00:00',
    dateModified: '2026-01-15T00:00:00+00:00',
    author: {
      '@type': 'Organization',
      name: 'Scaniha',
      url: 'https://scaniha.com'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Scaniha',
      logo: {
        '@type': 'ImageObject',
        url: 'https://scaniha.com/logo.png'
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#FEFEFE]" dir="ltr">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/blog" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Retour au blog</Link>
        <article>
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-4">Comment créer un menu QR pour votre restaurant — Guide étape par étape</h1>
          <time className="text-zinc-500 mb-8 block">15 janvier 2026</time>

          <div className="prose prose-lg max-w-none text-zinc-700 space-y-6">
            <p>Créer un menu QR pour votre restaurant est l’un des investissements les plus judicieux que vous puissiez faire. Il vous fait économiser sur l’impression, réduit les contacts et vous permet de mettre à jour vos prix instantanément. Voici exactement comment procéder avec Scaniha.</p>

            <h2 className="text-2xl font-bold text-zinc-900 mt-8">Étape 1 : Inscrivez-vous sur Scaniha</h2>
            <p>Rendez-vous sur <Link href="/business-request" className="text-orange-600">scaniha.com/business-request</Link> et créez votre compte gratuit. Aucune carte bancaire n’est requise pour l’essai de 7 jours. Saisissez votre e-mail, choisissez un mot de passe et indiquez le nom de votre établissement.</p>

            <h2 className="text-2xl font-bold text-zinc-900 mt-8">Étape 2 : Ajoutez les articles de votre menu</h2>
            <p>Utilisez le créateur de menu de Scaniha pour ajouter des catégories (Entrées, Plats principaux, Desserts, Boissons) et des articles sous chaque catégorie. Pour chaque article, ajoutez un nom, un prix, une description et une photo facultative. Vous pouvez également importer vos articles depuis un fichier Excel.</p>

            <h2 className="text-2xl font-bold text-zinc-900 mt-8">Étape 3 : Personnalisez votre thème</h2>
            <p>Choisissez parmi des thèmes premium et personnalisez les couleurs pour les harmoniser avec l’identité visuelle de votre restaurant. Définissez une couleur principale assortie au logo et à la décoration de votre établissement.</p>

            <h2 className="text-2xl font-bold text-zinc-900 mt-8">Étape 4 : Générez votre code QR</h2>
            <p>Scaniha génère automatiquement un code QR unique pour votre menu. Téléchargez-le sous forme d’image haute résolution prête à imprimer. Vous pouvez aussi partager le lien du menu sur les réseaux sociaux ou sur votre site web.</p>

            <h2 className="text-2xl font-bold text-zinc-900 mt-8">Étape 5 : Imprimez et affichez</h2>
            <p>Imprimez votre code QR sur des chevalets de table, des sets de table, des autocollants de vitrine ou des flyers. Les clients scannent le code avec l’appareil photo de n’importe quel smartphone et consultent votre menu instantanément dans leur navigateur.</p>

            <h2 className="text-2xl font-bold text-zinc-900 mt-8">Étape 6 : Mettez à jour en temps réel</h2>
            <p>Chaque fois que vous devez modifier des prix, ajouter de nouveaux articles ou retirer des plats épuisés, mettez à jour votre menu dans Scaniha. Les changements apparaissent instantanément — aucune réimpression nécessaire.</p>

            <div className="bg-orange-50 p-6 rounded-2xl mt-8">
              <p className="text-lg font-semibold text-zinc-900">Prêt à créer votre menu QR ?</p>
              <Link href="/business-request" className="inline-block mt-4 px-8 py-4 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-bold shadow-lg">Démarrer l’essai gratuit</Link>
            </div>

            <p className="mt-8">À lire aussi : <Link href="/blog/benefits-of-digital-menus" className="text-orange-600">Les avantages des menus numériques pour les restaurants</Link> · <Link href="/blog/qr-code-best-practices-restaurants" className="text-orange-600">Les bonnes pratiques du code QR</Link></p>
          </div>
        </article>
      </div>
    </div>
  )
}
