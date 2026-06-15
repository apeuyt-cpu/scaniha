import type { Metadata } from 'next'
import SignupForm from '@/components/auth/SignupForm'
import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: 'https://scaniha.com/signup' },
  title: 'Inscription | Scaniha - Créateur de menus QR',
  description: 'Créez votre compte Scaniha gratuit et commencez à concevoir de superbes menus numériques QR pour votre restaurant, café ou commerce alimentaire en quelques minutes.',
  openGraph: {
    images: [{ url: '/og-scaniha.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'Scaniha — Créateur de menu QR pour restaurants et cafés' }], 
    title: 'Inscription | Scaniha - Créateur de menus QR',
    description: 'Créez gratuitement votre menu numérique QR pour votre restaurant ou café.',
    url: 'https://scaniha.com/signup',
    siteName: 'Scaniha',
    type: 'website',
  },
  twitter: {
    images: ['/og-scaniha.jpg'], 
    card: 'summary_large_image',
    title: 'Inscription | Scaniha - Créateur de menus QR',
    description: 'Créez gratuitement votre menu numérique QR pour votre restaurant ou café.',
  },
}

export default async function SignupPage({ searchParams }: { searchParams?: Promise<{ plan?: string }> }) {
  const plan = (await searchParams)?.plan

  return (
    <div className="flex min-h-screen flex-col bg-[#FEFEFE] px-6 py-10" dir="ltr">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        {/* Logo */}
        <Link href="/" className="mx-auto mb-8 block w-fit">
          <Image src="/logo.png" alt="Scaniha" width={140} height={46} className="h-11 w-auto" priority />
        </Link>

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-zinc-900">Créez votre compte</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Essai gratuit de 7 jours — aucune carte requise.
          </p>
        </div>

        {/* Form */}
        <div className="mt-8">
          <SignupForm plan={plan} />
        </div>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-zinc-500">
          Vous avez déjà un compte&nbsp;?{' '}
          <Link href="/login" className="font-semibold text-orange-600 hover:text-orange-700">
            Connectez-vous
          </Link>
        </p>
      </div>
    </div>
  )
}
