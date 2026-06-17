import type { Metadata } from 'next'
import Link from 'next/link'
import PricingComparison from '@/components/pricing/PricingComparison'

export const metadata: Metadata = {
  alternates: { canonical: 'https://scaniha.com/pricing' },
  title: 'Tarifs | Scaniha - Créateur de menu QR',
  description: 'Choisissez le forfait idéal pour votre restaurant ou café. Commencez par un essai gratuit de 7 jours. Forfaits 1 an et à vie disponibles. Sans frais cachés.',
  openGraph: {
    images: [{ url: '/og-scaniha.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'Scaniha — Créateur de menu QR pour restaurants et cafés' }], 
    title: 'Tarifs | Scaniha - Créateur de menu QR',
    description: 'Des forfaits abordables pour les restaurants, cafés et commerces de restauration. Commencez gratuitement.',
    url: 'https://scaniha.com/pricing',
    siteName: 'Scaniha',
    type: 'website',
  },
  twitter: {
    images: ['/og-scaniha.jpg'], 
    card: 'summary_large_image',
    title: 'Tarifs | Scaniha - Créateur de menu QR',
    description: 'Des forfaits abordables pour les restaurants, cafés et commerces de restauration.',
  },
}

const faqs = [
  {
    q: 'Comment se passe le paiement ?',
    a: 'Le paiement se fait par virement bancaire. Après votre inscription, vous trouverez les coordonnées bancaires dans votre tableau de bord, puis vous y déposez le reçu de votre virement. Nous activons votre compte dès la réception et la vérification du paiement.',
  },
  {
    q: 'Acceptez-vous les paiements par carte bancaire ?',
    a: 'Non. Le règlement se fait uniquement par virement bancaire. Aucune donnée de carte n’est demandée ni stockée sur la plateforme.',
  },
  {
    q: 'Le paiement est-il unique ou récurrent ?',
    a: 'Le paiement est unique pour la durée choisie (1 an ou à vie). Il n’y a aucun abonnement et aucun prélèvement automatique. Pour le forfait à vie, vous pouvez régler en 2 versements de 125 TND, sans frais.',
  },
  {
    q: 'Puis-je commencer sans payer ?',
    a: 'Oui. Vous pouvez créer votre menu et le tester pendant 7 jours gratuitement, sans aucun paiement. Vous choisissez ensuite un forfait pour continuer.',
  },
  {
    q: 'Puis-je passer à un forfait supérieur plus tard ?',
    a: 'Oui. Vous pouvez commencer par un forfait court puis passer à une durée plus longue (par exemple « à vie ») à tout moment. Contactez-nous via la page Contact pour organiser le changement.',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white" dir="ltr">
      <div className="mx-auto max-w-[1100px] px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <Link
          href="/"
          className="mb-12 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
        >
          <span aria-hidden="true">&larr;</span> Retour à l&apos;accueil
        </Link>

        {/* Heading */}
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">Tarifs</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Un prix simple, sans surprise
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-zinc-500">
            Choisissez la durée qui vous convient. Toutes les fonctionnalités sont incluses dans chaque forfait.
          </p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-sm font-medium text-zinc-600">
            <span className="text-orange-500" aria-hidden="true">✓</span>
            Essai gratuit de 7 jours · Aucun paiement requis
          </p>
        </div>

        {/* Plans (shared with the landing page) */}
        <PricingComparison />

        {/* Free-trial note */}
        <div className="mt-12 text-center">
          <Link href="/signup" className="text-sm font-semibold text-orange-600 transition-colors hover:text-orange-700">
            Démarrer l&apos;essai gratuit &rarr;
          </Link>
        </div>

        {/* FAQ */}
        <section className="mx-auto mt-24 max-w-3xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-zinc-900">Questions fréquentes</h2>
          <p className="mt-2 mb-10 text-center text-zinc-500">Tout ce qu’il faut savoir avant de commencer.</p>
          <div className="divide-y divide-zinc-200 border-t border-zinc-200">
            {faqs.map((item) => (
              <div key={item.q} className="py-6">
                <h3 className="font-semibold text-zinc-900">{item.q}</h3>
                <p className="mt-2 leading-relaxed text-zinc-600">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
