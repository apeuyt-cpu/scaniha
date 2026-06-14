import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Menu QR pour restaurants | Créateur de menu QR gratuit | Scaniha',
  description: 'Créez un menu QR gratuit pour votre restaurant avec Scaniha. Générez des QR codes, gérez vos articles en temps réel et offrez une expérience sans contact. Aucune application requise. Commencez maintenant.',
  openGraph: { title: 'Menu QR pour restaurants | Créateur de menu QR gratuit | Scaniha', description: 'Créez un menu QR gratuit pour votre restaurant. Aucun téléchargement d\'application nécessaire.', url: 'https://scaniha.com/qr-menu-for-restaurants', siteName: 'Scaniha', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Menu QR pour restaurants | Créateur de menu QR gratuit | Scaniha', description: 'Créez un menu QR gratuit pour votre restaurant. Générez des QR codes instantanément.' },
  alternates: { canonical: 'https://scaniha.com/qr-menu-for-restaurants' },
}

export default function QRMenuForRestaurantsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FEFEFE] via-[#FEFEFE] to-[#FEFEFE]" dir="ltr">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Retour à Scaniha</Link>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Menu QR pour restaurants</h1>
          <p className="text-xl text-zinc-600 max-w-3xl mx-auto">Remplacez les menus papier par un menu QR moderne pour votre restaurant. Les clients scannent, consultent et commandent — aucune application requise.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE] text-center"><h2 className="text-2xl font-bold text-zinc-900 mb-3">Génération de QR instantanée</h2><p className="text-zinc-600">Créez un QR code unique pour le menu de votre restaurant en quelques secondes. Imprimez-le sur des chevalets de table, des flyers ou des vitrines.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE] text-center"><h2 className="text-2xl font-bold text-zinc-900 mb-3">Mises à jour en temps réel</h2><p className="text-zinc-600">Modifiez les prix, ajoutez des plats du jour ou mettez à jour vos articles instantanément. Votre menu QR reste à jour sans réimpression.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE] text-center"><h2 className="text-2xl font-bold text-zinc-900 mb-3">Sans contact et sûr</h2><p className="text-zinc-600">Offrez une expérience de restauration sans contact. Les clients scannent avec l'appareil photo de leur téléphone — aucun téléchargement ni connexion.</p></div>
        </div>
        <div className="text-center"><Link href="/features" className="text-orange-600 font-semibold hover:text-orange-700 mr-6">Voir toutes les fonctionnalités →</Link><Link href="/signup" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Créez votre menu QR gratuitement</Link></div>
        <div className="mt-16 text-center"><Link href="/pricing" className="text-orange-600 font-semibold hover:text-orange-700">Voir les tarifs →</Link></div>
      </div>
    </div>
  )
}
