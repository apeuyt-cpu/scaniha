import type { Metadata } from 'next'
import LoginForm from '@/components/auth/LoginForm'
import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Connexion | Scaniha - Créateur de menus QR',
  description: 'Connectez-vous à votre compte Scaniha pour gérer vos menus numériques, suivre vos statistiques et mettre à jour le menu de votre restaurant ou café.',
  robots: { index: false, follow: false },
  openGraph: {
    images: [{ url: '/og-scaniha.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'Scaniha — Créateur de menu QR pour restaurants et cafés' }], 
    title: 'Connexion | Scaniha - Créateur de menus QR',
    description: 'Connectez-vous pour gérer vos menus numériques de restaurant.',
    url: 'https://scaniha.com/login',
    siteName: 'Scaniha',
    type: 'website',
  },
  twitter: {
    images: ['/og-scaniha.jpg'], 
    card: 'summary_large_image',
    title: 'Connexion | Scaniha - Créateur de menus QR',
    description: 'Connectez-vous pour gérer vos menus numériques de restaurant.',
  },
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FEFEFE] px-6 py-10" dir="ltr">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        {/* Logo */}
        <Link href="/" className="mx-auto mb-8 block w-fit">
          <Image src="/logo.png" alt="Scaniha" width={140} height={46} className="h-11 w-auto" priority />
        </Link>

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-zinc-900">Bon retour <span aria-hidden="true">👋</span></h1>
          <p className="mt-1.5 text-sm text-zinc-500">Connectez-vous pour gérer votre menu.</p>
        </div>

        {/* Form */}
        <div className="mt-8">
          <LoginForm />
        </div>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-zinc-500">
          Pas encore de compte&nbsp;?{' '}
          <Link href="/business-request" className="font-semibold text-orange-600 hover:text-orange-700">
            Inscrivez-vous
          </Link>
        </p>
      </div>
    </div>
  )
}
