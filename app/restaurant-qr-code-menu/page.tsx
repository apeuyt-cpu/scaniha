import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Menu QR code de restaurant | Menu numérique avec QR codes | Scaniha',
  description: 'Transformez le menu de votre restaurant en menu QR code. Les clients scannent et consultent instantanément. Aucun téléchargement d\'application. Essai gratuit disponible. Créez votre menu QR code de restaurant dès aujourd\'hui.',
  openGraph: {
    images: [{ url: '/og-scaniha.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'Scaniha — Créateur de menu QR pour restaurants et cafés' }],  title: 'Menu QR code de restaurant | Menu numérique avec QR codes | Scaniha', description: 'Transformez le menu de votre restaurant en menu QR code. Les clients scannent et consultent instantanément.', url: 'https://scaniha.com/restaurant-qr-code-menu', siteName: 'Scaniha', type: 'website' },
  twitter: {
    images: ['/og-scaniha.jpg'],  card: 'summary_large_image', title: 'Menu QR code de restaurant | Menu numérique avec QR codes | Scaniha', description: 'Transformez le menu de votre restaurant en menu QR code avec Scaniha.' },
  alternates: { canonical: 'https://scaniha.com/restaurant-qr-code-menu' },
}

export default function RestaurantQRCodeMenuPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FEFEFE] via-[#FEFEFE] to-[#FEFEFE]" dir="ltr">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Retour à Scaniha</Link>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Menu QR code de restaurant</h1>
          <p className="text-xl text-zinc-600 max-w-3xl mx-auto">Remplacez les menus papier par un menu QR code moderne pour votre restaurant. Générez un QR code unique, imprimez-le sur vos tables et laissez vos clients consulter votre menu instantanément.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE]"><h2 className="text-xl font-bold text-zinc-900 mb-3">Pourquoi un menu QR ?</h2><p className="text-zinc-600">Économique, hygiénique et toujours à jour. Fini les réimpressions de menus à chaque changement de prix ou d'article.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE]"><h2 className="text-xl font-bold text-zinc-900 mb-3">Comment ça marche</h2><p className="text-zinc-600">Inscrivez-vous, ajoutez vos articles, générez un QR code et placez-le sur les tables. Les clients scannent avec l'appareil photo de n'importe quel smartphone.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE]"><h2 className="text-xl font-bold text-zinc-900 mb-3">Fonctionne partout</h2><p className="text-zinc-600">Aucun matériel spécial nécessaire. Fonctionne sur tout smartphone doté d'un appareil photo. Les clients pointent, scannent et parcourent le menu.</p></div>
        </div>
        <div className="text-center"><Link href="/digital-menu-builder" className="text-orange-600 font-semibold hover:text-orange-700 mr-6">Découvrir le créateur de menu numérique →</Link><Link href="/business-request" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Créez votre menu QR gratuitement</Link></div>
        <div className="mt-16 text-center"><Link href="/pricing" className="text-orange-600 font-semibold hover:text-orange-700">Voir les forfaits →</Link></div>
      </div>
    </div>
  )
}
