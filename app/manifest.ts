import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Scaniha — Créateur de menu QR pour restaurants et cafés',
    short_name: 'Scaniha',
    description:
      'Scaniha crée des menus QR numériques élégants pour les restaurants et cafés en Tunisie. Sans application, prêt en quelques minutes.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FEFEFE',
    theme_color: '#F47B20',
    lang: 'fr',
    dir: 'ltr',
    categories: ['food', 'business', 'productivity'],
    icons: [
      { src: '/logo.png', sizes: 'any', type: 'image/png', purpose: 'any' },
    ],
  }
}
