import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Créateur de menu QR gratuit | Créez un menu QR gratuitement | Scaniha',
  description: 'Créez un menu QR gratuit pour votre restaurant ou café avec Scaniha. Aucune carte bancaire requise. Essai gratuit de 7 jours. Générez des QR codes et gérez votre menu en ligne sans frais.',
  openGraph: { title: 'Créateur de menu QR gratuit | Créez un menu QR gratuitement | Scaniha', description: 'Créez un menu QR gratuit avec Scaniha. Aucune carte bancaire requise. Essai gratuit de 7 jours.', url: 'https://scaniha.com/free-qr-menu', siteName: 'Scaniha', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Créateur de menu QR gratuit | Créez un menu QR gratuitement | Scaniha', description: 'Créez un menu QR gratuit avec Scaniha. Aucune carte bancaire requise.' },
  alternates: { canonical: 'https://scaniha.com/free-qr-menu' },
}

export default function FreeQRMenuPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FEFEFE] via-[#FEFEFE] to-[#FEFEFE]" dir="ltr">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Retour à Scaniha</Link>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Créateur de menu QR gratuit</h1>
          <p className="text-xl text-zinc-600 max-w-3xl mx-auto">Créez un menu QR gratuit pour votre restaurant ou café. Aucune carte bancaire requise. Commencez avec un essai gratuit de 7 jours et découvrez pourquoi les restaurants adorent Scaniha.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE]"><h2 className="text-xl font-bold text-zinc-900 mb-3">Entièrement gratuit pour démarrer</h2><p className="text-zinc-600">Inscrivez-vous en 30 secondes. Aucune carte bancaire, aucun engagement. Accédez à toutes les fonctionnalités pendant votre essai gratuit de 7 jours.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE]"><h2 className="text-xl font-bold text-zinc-900 mb-3">Essai complet</h2><p className="text-zinc-600">Profitez d'un nombre illimité d'articles, de catégories, de thèmes et de génération de QR codes. Découvrez tout ce que Scaniha propose.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE]"><h2 className="text-xl font-bold text-zinc-900 mb-3">Aucuns frais cachés</h2><p className="text-zinc-600">Une tarification transparente, sans surprise. Ne payez que lorsque vous êtes prêt à continuer après votre essai.</p></div>
        </div>
        <div className="text-center"><Link href="/qr-menu-for-restaurants" className="text-orange-600 font-semibold hover:text-orange-700 mr-6">En savoir plus sur les menus QR →</Link><Link href="/signup" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Démarrer l'essai gratuit</Link></div>
        <div className="mt-16 text-center"><Link href="/pricing" className="text-orange-600 font-semibold hover:text-orange-700">Voir les forfaits payants →</Link></div>
      </div>
    </div>
  )
}
