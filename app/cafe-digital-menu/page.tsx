import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Menu numérique pour cafés | Menu QR pour salons de café | Scaniha',
  description: 'Créez un menu numérique pour votre café ou salon de café avec Scaniha. Superbe créateur de menu QR conçu pour les cafés. Présentez vos boissons, vos pâtisseries et vos plats du jour. Essai gratuit.',
  openGraph: {
    images: [{ url: '/og-scaniha.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'Scaniha — Créateur de menu QR pour restaurants et cafés' }],  title: 'Menu numérique pour cafés | Menu QR pour salons de café | Scaniha', description: 'Créez un menu numérique pour votre café avec Scaniha. Superbe menu QR pour les salons de café.', url: 'https://scaniha.com/cafe-digital-menu', siteName: 'Scaniha', type: 'website' },
  twitter: {
    images: ['/og-scaniha.jpg'],  card: 'summary_large_image', title: 'Menu numérique pour cafés | Menu QR pour salons de café | Scaniha', description: 'Créez un menu numérique pour votre café avec Scaniha.' },
  alternates: { canonical: 'https://scaniha.com/cafe-digital-menu' },
}

export default function CafeDigitalMenuPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FEFEFE] via-[#FEFEFE] to-[#FEFEFE]" dir="ltr">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Retour à Scaniha</Link>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Menu numérique pour cafés</h1>
          <p className="text-xl text-zinc-600 max-w-3xl mx-auto">Créez un superbe menu numérique pour votre café ou salon de café. Présentez vos boissons, vos pâtisseries et vos plats du jour grâce à un simple scan de QR.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE]"><h2 className="text-xl font-bold text-zinc-900 mb-3">Parfait pour les cafés</h2><p className="text-zinc-600">Mettez en valeur vos variétés de café, vos thés, vos pâtisseries et vos spécialités de saison. Classez vos boissons par type — chaudes, froides, signature.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE]"><h2 className="text-xl font-bold text-zinc-900 mb-3">Plats du jour</h2><p className="text-zinc-600">Ajoutez des plats du jour ou des menus de saison en quelques secondes. Mettez en avant vos articles phares avec des images et des descriptions.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE]"><h2 className="text-xl font-bold text-zinc-900 mb-3">QR codes de table</h2><p className="text-zinc-600">Placez des QR codes sur chaque table. Les clients parcourent le menu de votre café instantanément, sans attendre un serveur.</p></div>
        </div>
        <div className="text-center"><Link href="/online-menu-for-restaurants" className="text-orange-600 font-semibold hover:text-orange-700 mr-6">Menu en ligne pour restaurants →</Link><Link href="/signup" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Créez le menu de votre café</Link></div>
        <div className="mt-16 text-center"><Link href="/free-qr-menu" className="text-orange-600 font-semibold hover:text-orange-700">Essayer le menu QR gratuit →</Link></div>
      </div>
    </div>
  )
}
