import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contact | Assistance menu QR Scaniha',
  description: 'Contactez Scaniha. Joignez notre équipe d\'assistance pour obtenir de l\'aide sur votre menu QR numérique. Écrivez-nous ou consultez notre centre d\'aide.',
  openGraph: { title: 'Contact | Assistance menu QR Scaniha', description: 'Contactez l\'assistance Scaniha.', url: 'https://scaniha.com/contact', siteName: 'Scaniha', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Contact | Assistance menu QR Scaniha', description: 'Contactez l\'assistance Scaniha.' },
  alternates: { canonical: 'https://scaniha.com/contact' },
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#FEFEFE]" dir="ltr">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Retour à Scaniha</Link>
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Contactez-nous</h1>
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto">Vous avez des questions sur Scaniha ? Nous sommes là pour vous aider.</p>
        </div>
        <div className="max-w-md mx-auto space-y-8">
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE] text-center">
            <h2 className="text-xl font-bold text-zinc-900 mb-2">E-mail</h2>
            <p className="text-sm text-zinc-600 mb-3">
              La meilleure façon de nous joindre. Écrivez-nous et notre équipe vous répond
              généralement sous 24&nbsp;heures (jours ouvrés).
            </p>
            <a
              href="mailto:support@scaniha.com?subject=Demande%20d'assistance%20Scaniha"
              className="inline-block rounded-xl bg-gradient-to-r from-[#F47B20] to-[#F5B82E] px-6 py-3 font-semibold text-white shadow-md transition hover:opacity-95"
            >
              Écrire à support@scaniha.com
            </a>
          </div>
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE] text-center">
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Téléphone</h2>
            <p className="text-sm text-zinc-600 mb-3">
              Besoin d&apos;une réponse rapide&nbsp;? Appelez-nous ou écrivez-nous sur WhatsApp.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <a
                href="tel:+21651089100"
                className="inline-block rounded-xl bg-zinc-900 px-6 py-3 font-semibold text-white transition hover:bg-zinc-800"
              >
                📞 +216 51 089 100
              </a>
              <a
                href="https://wa.me/21651089100"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
              >
                WhatsApp
              </a>
            </div>
          </div>
          <div className="p-6 rounded-2xl border border-zinc-200 bg-[#FEFEFE] text-center">
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Liens rapides</h2>
            <div className="flex flex-col gap-3">
              <Link href="/pricing" className="text-orange-600 font-semibold hover:text-orange-700">Voir les tarifs</Link>
              <Link href="/features" className="text-orange-600 font-semibold hover:text-orange-700">Découvrir les fonctionnalités</Link>
              <Link href="/about" className="text-orange-600 font-semibold hover:text-orange-700">À propos de Scaniha</Link>
            </div>
          </div>
        </div>
        <div className="text-center mt-12"><Link href="/signup" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Commencer gratuitement</Link></div>
      </div>
    </div>
  )
}
