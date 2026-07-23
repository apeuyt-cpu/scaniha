import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const competitors: Record<string, { name: string, description: string }> = {
  'menulog': { name: 'MenuLog', description: 'Scaniha propose une solution de menu QR plus abordable et plus complète que les plateformes de menus traditionnelles.' },
  'qrmenu': { name: 'QR Menu', description: 'Scaniha offre des mises à jour en temps réel, une interface entièrement en français et de meilleures statistiques que les générateurs de menus QR basiques.' },
  'menuly': { name: 'Menuly', description: 'Scaniha est conçu spécifiquement pour les restaurants et cafés, avec des fonctionnalités telles que les statistiques de consultation et le jeu de la roue de la chance.' },
  'restomenu': { name: 'RestoMenu', description: 'Scaniha offre une génération de QR code instantanée, aucune application requise et un processus de configuration plus simple.' },
  'gloriafood': { name: 'GloriaFood', description: 'Scaniha offre une alternative moderne sans commission cachée, centrée sur un menu QR fluide sans application et un design haut de gamme.' },
  'mryum': { name: 'Mr Yum', description: 'Scaniha est une alternative plus abordable avec une tarification fixe (sans commission par commande) idéale pour les établissements indépendants.' },
  'finedine': { name: 'FineDine', description: 'Scaniha propose une création de menu instantanée beaucoup plus accessible pour les restaurants cherchant une solution rapide et sans matériel tablette complexe.' },
  'linktree': { name: 'Linktree', description: 'Contrairement à Linktree (qui est un simple agrégateur de liens), Scaniha est un véritable créateur de menu interactif avec catégories, prix, photos et statistiques avancées.' },
}

export function generateStaticParams() {
  return Object.keys(competitors).map((competitor) => ({ competitor }))
}

export async function generateMetadata({ params }: { params: Promise<{ competitor: string }> }): Promise<Metadata> {
  const { competitor } = await params
  const comp = competitors[competitor.toLowerCase()]
  if (!comp) {
    return { title: 'Page introuvable | Scaniha', robots: { index: false, follow: false } }
  }
  return {
    title: `Scaniha vs ${comp.name} | Comparatif des créateurs de menu QR`,
    description: `Comparez Scaniha avec ${comp.name}. Découvrez pourquoi Scaniha est le meilleur choix pour le menu numérique de votre restaurant.`,
    alternates: { canonical: `https://scaniha.com/compare/${competitor}` },
    openGraph: {
    images: [{ url: '/og-scaniha.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'Scaniha — Créateur de menu QR pour restaurants et cafés' }], 
      title: `Scaniha vs ${comp.name} | Comparatif`,
      description: `Découvrez pourquoi les restaurants choisissent Scaniha plutôt que ${comp.name}.`,
      url: `https://scaniha.com/compare/${competitor}`,
      siteName: 'Scaniha',
      type: 'website',
    },
    twitter: {
    images: ['/og-scaniha.jpg'], 
      card: 'summary_large_image',
      title: `Scaniha vs ${comp.name}`,
      description: `Découvrez pourquoi les restaurants choisissent Scaniha plutôt que ${comp.name}.`,
    },
  }
}

export default async function ComparePage({ params }: { params: Promise<{ competitor: string }> }) {
  const { competitor } = await params
  const comp = competitors[competitor.toLowerCase()]

  if (!comp) {
    notFound()
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Pourquoi choisir Scaniha plutôt que ${comp.name} ?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Scaniha est la meilleure alternative à ${comp.name} car il offre des mises à jour en temps réel, aucune application requise pour les clients, et une tarification transparente sans commission cachée par commande.`
        }
      },
      {
        '@type': 'Question',
        name: `Quelles sont les différences de prix entre Scaniha et ${comp.name} ?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Scaniha propose un essai 100% gratuit, suivi de forfaits abordables ou d'un paiement unique à vie, sans prendre de commission sur chaque transaction contrairement à de nombreuses plateformes comme ${comp.name}.`
        }
      }
    ]
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FEFEFE] via-[#FEFEFE] to-[#FEFEFE]" dir="ltr">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Retour à l'accueil</Link>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-4">Scaniha vs {comp.name}</h1>
        <p className="text-xl text-zinc-600 mb-12">{comp.description}</p>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 mb-6">Pourquoi choisir Scaniha ?</h2>
          <ul className="space-y-4 text-zinc-600">
            <li className="flex items-start gap-3"><span className="text-green-600 font-bold mt-1">✓</span> <span><strong>Mises à jour en temps réel :</strong> modifiez votre menu instantanément — aucun délai, aucune mise à jour d'application.</span></li>
            <li className="flex items-start gap-3"><span className="text-green-600 font-bold mt-1">✓</span> <span><strong>Tout en français :</strong> une interface et des menus entièrement en français pour servir vos clients en toute fluidité.</span></li>
            <li className="flex items-start gap-3"><span className="text-green-600 font-bold mt-1">✓</span> <span><strong>Aucune application requise :</strong> les clients scannent et consultent instantanément. Zéro friction.</span></li>
            <li className="flex items-start gap-3"><span className="text-green-600 font-bold mt-1">✓</span> <span><strong>Conçu pour la restauration :</strong> des fonctionnalités pensées spécifiquement pour les restaurants et les cafés.</span></li>
            <li className="flex items-start gap-3"><span className="text-green-600 font-bold mt-1">✓</span> <span><strong>Tarifs abordables :</strong> commencez gratuitement, puis choisissez parmi des forfaits flexibles adaptés à votre budget.</span></li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">Ce que Scaniha inclut</h2>
          <p className="text-sm text-zinc-500 mb-6">
            Voici les fonctionnalités fournies avec Scaniha. Comparez-les à votre solution actuelle pour voir ce qui vous convient le mieux.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-[#FEFEFE]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-3 px-4 font-bold text-zinc-900">Fonctionnalité</th>
                  <th className="text-left py-3 px-4 font-bold text-orange-600">Inclus avec Scaniha</th>
                </tr>
              </thead>
              <tbody>
                {[
                  'Mises à jour du menu en temps réel',
                  'Interface et menus entièrement en français',
                  'Aucune application requise pour vos clients',
                  'Statistiques de consultation',
                  'Jeu de la roue de la chance',
                  'Paiement unique à vie (en TND)',
                  'Essai gratuit de 7 jours',
                  'Support prioritaire',
                ].map((feature, i) => (
                  <tr key={i} className="border-b border-zinc-200">
                    <td className="py-3 px-4 text-zinc-700 font-medium">{feature}</td>
                    <td className="py-3 px-4 font-bold text-green-600"><span aria-hidden="true">✓</span> <span className="sr-only">Inclus</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="text-center">
          <Link href="/business-request" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Essayez Scaniha gratuitement</Link>
        </div>
      </div>
    </div>
  )
}
