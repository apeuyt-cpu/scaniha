import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Menu en ligne pour restaurants | Menu de restaurant numérique | Scaniha',
  description: 'Créez un menu en ligne pour votre restaurant avec Scaniha. Partagez votre menu par QR code, lien ou réseaux sociaux. Mettez à jour en temps réel. Essai gratuit disponible.',
  openGraph: {
    images: [{ url: '/og-scaniha.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'Scaniha — Créateur de menu QR pour restaurants et cafés' }],  title: 'Menu en ligne pour restaurants | Menu de restaurant numérique | Scaniha', description: 'Créez un menu en ligne pour votre restaurant avec Scaniha. Partagez par QR code ou lien.', url: 'https://scaniha.com/online-menu-for-restaurants', siteName: 'Scaniha', type: 'website' },
  twitter: {
    images: ['/og-scaniha.jpg'],  card: 'summary_large_image', title: 'Menu en ligne pour restaurants | Menu de restaurant numérique | Scaniha', description: 'Créez un menu en ligne pour votre restaurant avec Scaniha.' },
  alternates: { canonical: 'https://scaniha.com/online-menu-for-restaurants' },
}

export default function OnlineMenuForRestaurantsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FEFEFE] via-[#FEFEFE] to-[#FEFEFE]" dir="ltr">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Retour à Scaniha</Link>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Menu en ligne pour restaurants</h1>
          <p className="text-xl text-zinc-600 max-w-3xl mx-auto">Mettez le menu de votre restaurant en ligne avec Scaniha. Partagez votre menu numérique par QR code, lien direct ou réseaux sociaux. Mettez à jour vos articles et vos prix instantanément.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE]"><h2 className="text-xl font-bold text-zinc-900 mb-3">Partagez partout</h2><p className="text-zinc-600">Votre menu en ligne fonctionne sur les QR codes, les intégrations de site web, les liens sur les réseaux sociaux et les SMS. Vos clients peuvent y accéder de n'importe où.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE]"><h2 className="text-xl font-bold text-zinc-900 mb-3">Mises à jour en temps réel</h2><p className="text-zinc-600">Modifiez les prix, ajoutez des plats du jour ou retirez les articles épuisés instantanément. Votre menu en ligne est toujours à jour.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE]"><h2 className="text-xl font-bold text-zinc-900 mb-3">Un design soigné</h2><p className="text-zinc-600">Choisissez parmi des thèmes personnalisables qui correspondent à votre marque. Votre menu en ligne reste professionnel sur tous les appareils.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE]"><h2 className="text-xl font-bold text-zinc-900 mb-3">Connaissance client</h2><p className="text-zinc-600">Suivez les articles qui obtiennent le plus de vues, comprenez les préférences de vos clients et optimisez votre menu.</p></div>
        </div>
        <div className="text-center"><Link href="/free-qr-menu" className="text-orange-600 font-semibold hover:text-orange-700 mr-6">Essayer le menu QR gratuit →</Link><Link href="/business-request" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Créez votre menu en ligne</Link></div>
        <div className="mt-16 text-center"><Link href="/cafe-digital-menu" className="text-orange-600 font-semibold hover:text-orange-700">Menu numérique pour cafés →</Link></div>
      </div>
    </div>
  )
}
