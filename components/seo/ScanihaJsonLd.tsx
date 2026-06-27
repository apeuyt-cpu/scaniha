/**
 * Scaniha brand entity graph (Organization · Brand · Product · SoftwareApplication
 * · WebSite · FAQ). This is rendered ONLY on the marketing homepage — deliberately
 * NOT in the root layout — so that a client's public menu page (/[slug]) carries
 * its OWN Restaurant data and logo, never Scaniha's organization, logo or FAQ.
 * (Google reads Organization/WebSite markup from the site homepage.)
 */
export default function ScanihaJsonLd() {
  const blocks = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': 'https://scaniha.com/#organization',
      name: 'Scaniha',
      legalName: 'Scaniha',
      alternateName: ['Scaniha Tunisie', 'Scaniha Menu QR', 'Scaniha QR Menu', 'QR Menu Platform', 'Scaniha QR Menu Platform'],
      url: 'https://scaniha.com',
      logo: { '@type': 'ImageObject', url: 'https://scaniha.com/logo.png', width: 412, height: 371 },
      image: 'https://scaniha.com/og-scaniha.jpg',
      slogan: 'Votre menu QR, en un scan',
      description: 'Scaniha is a QR menu platform for restaurant menus — digital QR-code menus for restaurants, cafés and food businesses in Tunisia. Créateur de menu QR pour restaurants et cafés.',
      disambiguatingDescription:
        'Scaniha is a QR menu platform and digital restaurant-menu software for restaurants, cafés and food businesses in Tunisia. Scaniha est une application web tunisienne de création de menus QR (QR code) pour la restauration — une plateforme logicielle de menu QR, et non un constructeur de véhicules. Éditée par Rakiza Group.',
      knowsLanguage: 'fr',
      email: 'support@scaniha.com',
      telephone: '+216 51 089 100',
      founder: { '@type': 'Organization', name: 'Rakiza Group', url: 'https://rakiza.group' },
      parentOrganization: { '@type': 'Organization', name: 'Rakiza Group', url: 'https://rakiza.group' },
      employee: { '@type': 'Person', name: 'Hamed', jobTitle: 'PDG' },
      areaServed: { '@type': 'Country', name: 'Tunisie' },
      knowsAbout: [
        'menu QR', 'menu numérique', 'carte de restaurant numérique', 'QR code restaurant',
        'menu sans contact', 'menu en ligne', 'digitalisation de la restauration',
        'fidélité restaurant', 'menu lumineux', 'carte digitale café',
      ],
      address: { '@type': 'PostalAddress', addressCountry: 'TN' },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'support@scaniha.com',
        telephone: '+216 51 089 100',
        areaServed: 'TN',
        availableLanguage: ['French'],
      },
      sameAs: ['https://www.instagram.com/scaniha.co/', 'https://www.facebook.com/61587286774228'],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Brand',
      name: 'Scaniha',
      url: 'https://scaniha.com',
      description: 'QR menu platform for restaurant menus — créateur de menu QR pour restaurants, cafés et commerces alimentaires en Tunisie.',
      logo: 'https://scaniha.com/logo.png',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Scaniha - Créateur de menu QR',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: 'Créez de superbes menus QR code pour votre restaurant, café ou commerce alimentaire.',
      url: 'https://scaniha.com',
      brand: { '@type': 'Brand', name: 'Scaniha' },
      offers: { '@type': 'AggregateOffer', priceCurrency: 'TND', lowPrice: '0', highPrice: '300', offerCount: '3' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Scaniha',
      operatingSystem: 'Web',
      applicationCategory: 'BusinessApplication',
      description: 'Créez de superbes menus QR code pour votre restaurant, café ou commerce alimentaire.',
      url: 'https://scaniha.com',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'TND',
        description: 'Essai gratuit disponible. Menu QR à partir de 150 TND ; programme de fidélité à partir de 45 TND/mois.',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': 'https://scaniha.com/#website',
      name: 'Scaniha',
      alternateName: ['Scaniha Tunisie', 'Scaniha Menu QR', 'QR Menu Platform'],
      description: 'Scaniha — the QR menu platform for restaurant menus in Tunisia.',
      url: 'https://scaniha.com',
      inLanguage: 'fr',
      publisher: { '@id': 'https://scaniha.com/#organization' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: "Qu'est-ce que Scaniha ?",
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Scaniha est un créateur de menu QR numérique pour les restaurants, cafés et commerces alimentaires. Créez de superbes menus, générez des QR codes et partagez-les instantanément avec vos clients.',
          },
        },
        {
          '@type': 'Question',
          name: 'Comment créer un menu QR ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Inscrivez-vous gratuitement, ajoutez vos articles et catégories, personnalisez votre thème et générez un QR code. Placez le QR code sur les tables pour que les clients le scannent.',
          },
        },
        {
          '@type': 'Question',
          name: 'Scaniha est-il gratuit ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "Scaniha propose un essai gratuit de 7 jours sans paiement requis. Après l'essai, choisissez parmi nos forfaits de 6 mois, 1 an ou à vie.",
          },
        },
        {
          '@type': 'Question',
          name: 'Les clients doivent-ils télécharger une application ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "Non. Les clients scannent simplement le QR code avec l'appareil photo de leur téléphone et consultent le menu instantanément dans leur navigateur. Aucun téléchargement requis.",
          },
        },
        {
          '@type': 'Question',
          name: 'Puis-je mettre à jour mon menu en temps réel ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Oui. Toutes les modifications du menu sont répercutées instantanément. Mettez à jour les prix, ajoutez de nouveaux articles ou modifiez les catégories en temps réel, sans aucun délai.',
          },
        },
        {
          '@type': 'Question',
          name: 'Quelle langue Scaniha prend-il en charge ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "Scaniha est entièrement en français, pour l'interface de la plateforme comme pour les menus numériques.",
          },
        },
      ],
    },
  ]

  return (
    <>
      {blocks.map((b, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(b) }} />
      ))}
    </>
  )
}
