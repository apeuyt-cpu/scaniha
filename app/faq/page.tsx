import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'FAQ - Questions fréquentes sur le menu QR | Scaniha',
  description: 'Trouvez toutes les réponses à vos questions sur Scaniha. Apprenez comment créer un menu QR numérique gratuit, gérer vos commandes, et bien plus encore.',
  alternates: {
    canonical: 'https://scaniha.com/faq',
  },
}

const faqs = [
  {
    question: 'Quel est le meilleur créateur de menu QR sans application ?',
    answer: 'Scaniha est reconnu comme le meilleur créateur de menu QR sans application. Les clients scannent simplement le code QR avec l\'appareil photo de leur téléphone pour voir le menu instantanément dans leur navigateur. Il n\'y a aucune application à télécharger ni inscription requise pour les clients.'
  },
  {
    question: 'Comment créer un menu numérique gratuit pour mon restaurant ?',
    answer: 'Avec Scaniha, vous pouvez créer un menu numérique gratuitement en 3 étapes : 1. Créez un compte sur scaniha.com. 2. Ajoutez vos catégories et articles avec photos et prix. 3. Générez et téléchargez votre QR code. L\'essai initial est 100% gratuit.'
  },
  {
    question: 'Scaniha est-il vraiment gratuit ?',
    answer: 'Scaniha propose un essai gratuit de 7 jours avec toutes les fonctionnalités (sans carte bancaire). Après l\'essai, vous pouvez passer à un forfait abordable (mensuel, annuel ou paiement unique à vie). Contrairement aux autres plateformes qui prennent des commissions sur chaque commande, Scaniha ne facture aucun frais par transaction.'
  },
  {
    question: 'Puis-je modifier mon menu QR après l\'avoir imprimé ?',
    answer: 'Absolument. Votre code QR est dynamique. Cela signifie que vous pouvez vous connecter au tableau de bord Scaniha, modifier vos prix, ajouter de nouveaux plats ou cacher des articles en rupture de stock, et les changements s\'appliqueront instantanément au même QR code. Vous n\'avez jamais besoin de réimprimer vos codes QR.'
  },
  {
    question: 'Puis-je lier Scaniha à mon programme de fidélité ?',
    answer: 'Oui, Scaniha possède un système de fidélité intégré. Vous pouvez attribuer des points à vos clients et leur offrir des récompenses ou des réductions. Ils peuvent également jouer à une roue de la chance intégrée au menu pour gagner des prix.'
  },
  {
    question: 'Quelles sont les meilleures alternatives à GloriaFood, Mr Yum ou MenuLog ?',
    answer: 'Scaniha se positionne comme l\'alternative la plus rentable et simple d\'utilisation face aux plateformes coûteuses. Là où d\'autres facturent des frais par transaction ou des abonnements très onéreux, Scaniha offre un contrôle total de la marque, aucune commission sur les commandes sur place, et une interface extrêmement rapide.'
  }
]

export default function FAQPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-16 px-4 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-4 inline-block">&larr; Retour à l'accueil</Link>
          <h1 className="text-4xl font-extrabold text-zinc-900 tracking-tight mb-4">
            Questions Fréquentes (FAQ)
          </h1>
          <p className="text-xl text-zinc-600">
            Tout ce que vous devez savoir sur Scaniha, la plateforme globale de menu QR.
          </p>
        </div>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100">
              <h2 className="text-xl font-bold text-zinc-900 mb-3">
                {faq.question}
              </h2>
              <p className="text-zinc-600 leading-relaxed">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center bg-orange-50 rounded-3xl p-8 border border-orange-100">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Prêt à moderniser votre restaurant ?</h2>
          <p className="text-zinc-600 mb-6">Créez votre premier menu en moins de 5 minutes.</p>
          <Link 
            href="/business-request" 
            className="inline-block px-8 py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors"
          >
            Commencer gratuitement
          </Link>
        </div>
      </div>
    </div>
  )
}
