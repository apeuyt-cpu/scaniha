import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Créateur de menu numérique | Créez des menus de restaurant en ligne | Scaniha',
  description: 'Concevez de superbes menus numériques pour votre restaurant ou café avec Scaniha. Créateur de menu simple en glisser-déposer. Générez des QR codes, gérez les catégories et mettez à jour les prix en temps réel.',
  openGraph: {
    images: [{ url: '/og-scaniha.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'Scaniha — Créateur de menu QR pour restaurants et cafés' }],  title: 'Créateur de menu numérique | Créez des menus de restaurant en ligne | Scaniha', description: 'Concevez de superbes menus numériques pour votre restaurant. Créateur simple en glisser-déposer.', url: 'https://scaniha.com/digital-menu-builder', siteName: 'Scaniha', type: 'website' },
  twitter: {
    images: ['/og-scaniha.jpg'],  card: 'summary_large_image', title: 'Créateur de menu numérique | Créez des menus de restaurant en ligne | Scaniha', description: 'Concevez de superbes menus numériques pour votre restaurant avec Scaniha.' },
  alternates: { canonical: 'https://scaniha.com/digital-menu-builder' },
}

export default function DigitalMenuBuilderPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FEFEFE] via-[#FEFEFE] to-[#FEFEFE]" dir="ltr">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Retour à Scaniha</Link>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Créateur de menu numérique</h1>
          <p className="text-xl text-zinc-600 max-w-3xl mx-auto">Le créateur de menu numérique le plus simple pour les restaurants et les cafés. Créez, personnalisez et publiez votre menu en ligne en quelques minutes.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE]"><h2 className="text-xl font-bold text-zinc-900 mb-3">Créateur en glisser-déposer</h2><p className="text-zinc-600">Ajoutez des articles, des catégories, des prix et des descriptions grâce à une interface intuitive. Aucune compétence en code ou en design n'est nécessaire.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE]"><h2 className="text-xl font-bold text-zinc-900 mb-3">Menu en français</h2><p className="text-zinc-600">Créez des menus en français, clairs et professionnels. Idéal pour offrir à vos clients une expérience soignée et locale.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE]"><h2 className="text-xl font-bold text-zinc-900 mb-3">Thèmes personnalisés</h2><p className="text-zinc-600">Choisissez parmi des thèmes premium et personnalisez les couleurs pour correspondre à l'identité de votre restaurant.</p></div>
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE]"><h2 className="text-xl font-bold text-zinc-900 mb-3">Tableau de bord analytique</h2><p className="text-zinc-600">Suivez les vues de votre menu, les articles populaires et l'engagement des clients grâce aux statistiques intégrées.</p></div>
        </div>
        <div className="text-center"><Link href="/features" className="text-orange-600 font-semibold hover:text-orange-700 mr-6">Découvrir les fonctionnalités →</Link><Link href="/business-request" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Commencez à créer votre menu</Link></div>
        <div className="mt-16 text-center"><Link href="/qr-menu-for-restaurants" className="text-orange-600 font-semibold hover:text-orange-700">Créez un menu QR pour votre restaurant →</Link></div>
      </div>
    </div>
  )
}
