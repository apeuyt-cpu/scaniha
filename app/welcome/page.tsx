import type { Metadata } from 'next'
import WelcomeShowcase from '@/components/onboarding/WelcomeShowcase'

export const metadata: Metadata = {
  title: { absolute: 'Bienvenue | Scaniha' },
  description: 'Découvrez ce que Scaniha fait pour votre établissement.',
  robots: { index: false, follow: false },
}

/** First-run showcase after signup. The tour itself is a client component
 *  (reuses the client-side design thumbnails); this page just carries metadata. */
export default function WelcomePage() {
  return <WelcomeShowcase />
}
