import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  alternates: { canonical: 'https://scaniha.com/security' },
  title: 'Sécurité | Scaniha - Créateur de menu QR',
  description: 'Comment Scaniha protège vos données : connexions chiffrées (HTTPS/TLS), base de données Postgres avec isolation par compte, identifiants gérés par Supabase Auth, accès au moindre privilège et sauvegardes régulières.',
  openGraph: {
    title: 'Sécurité | Scaniha - Créateur de menu QR',
    description: 'Comment Scaniha protège les données de votre menu numérique : chiffrement des connexions, isolation des données et accès au moindre privilège.',
    url: 'https://scaniha.com/security',
    siteName: 'Scaniha',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sécurité | Scaniha - Créateur de menu QR',
    description: 'Comment Scaniha protège les données de votre menu numérique.',
  },
}

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#FEFEFE]" dir="ltr">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Retour à l&apos;accueil</Link>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-6">La sécurité chez Scaniha</h1>
        <p className="text-xl text-zinc-600 mb-12">
          La protection de vos données est une priorité. Voici, concrètement et sans jargon, les mesures que nous appliquons
          pour garder votre menu et votre compte en sécurité.
        </p>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Connexions chiffrées</h2>
          <div className="space-y-4 text-zinc-600">
            <p>
              <strong>HTTPS partout :</strong> l&apos;intégralité du trafic entre votre navigateur et nos serveurs passe
              par une connexion chiffrée (HTTPS/TLS). Vos identifiants et les données de votre menu ne circulent jamais en clair.
            </p>
            <p>
              <strong>Images :</strong> les photos de vos plats sont servies via un CDN d&apos;images en HTTPS,
              pour un affichage rapide et sécurisé sur tous les appareils.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Vos données et votre compte</h2>
          <ul className="space-y-3 text-zinc-600">
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">•</span>
              <span><strong>Base de données Postgres :</strong> vos données sont stockées dans une base PostgreSQL gérée par Supabase, un fournisseur cloud reconnu.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">•</span>
              <span><strong>Isolation par compte :</strong> grâce aux règles de sécurité au niveau des lignes (Row-Level Security), chaque établissement n&apos;accède qu&apos;à ses propres données.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">•</span>
              <span><strong>Mots de passe protégés :</strong> l&apos;authentification est assurée par Supabase Auth. Vos mots de passe sont stockés sous forme hachée — nous ne pouvons jamais les lire.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold">•</span>
              <span><strong>Accès au moindre privilège :</strong> chaque accès est limité au strict nécessaire pour faire fonctionner le service.</span>
            </li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Hébergement et sauvegardes</h2>
          <div className="space-y-4 text-zinc-600">
            <p>
              <strong>Hébergement fiable :</strong> notre plateforme et notre base de données sont hébergées chez des
              fournisseurs cloud reconnus, qui assurent la disponibilité et la maintenance de l&apos;infrastructure.
            </p>
            <p>
              <strong>Sauvegardes régulières :</strong> votre base de données est sauvegardée régulièrement par notre
              hébergeur, afin de pouvoir restaurer vos données en cas d&apos;incident.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Paiements</h2>
          <p className="text-zinc-600">
            Le paiement de votre forfait se fait par virement bancaire, avec envoi d&apos;un reçu depuis votre tableau de bord.
            Scaniha ne stocke aucune donnée de carte bancaire et ne traite aucun paiement par carte sur la plateforme.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Une question sur la sécurité ?</h2>
          <p className="text-zinc-600">
            Vous avez repéré un problème ou vous vous posez une question sur la protection de vos données ?
            Écrivez-nous via la page <Link href="/contact" className="text-orange-600 hover:text-orange-700 font-medium">Contact</Link> — nous vous répondrons.
          </p>
        </section>

        <div className="text-center mt-12">
          <Link href="/signup" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Démarrer votre essai gratuit</Link>
        </div>
      </div>
    </div>
  )
}
