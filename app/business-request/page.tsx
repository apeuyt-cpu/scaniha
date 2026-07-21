import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import BusinessRequestForm from '@/components/public/BusinessRequestForm'
import { isSelfSignupEnabled } from '@/lib/db/platform-settings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: 'https://scaniha.com/business-request' },
  title: 'Demander un accès | Scaniha',
  description:
    'Demandez votre menu QR et programme de fidélité Scaniha. Notre équipe configure votre établissement et vous accompagne au démarrage.',
  openGraph: {
    images: [{ url: '/og-scaniha.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'Scaniha — Menu QR et fidélité pour cafés et restaurants' }],
    title: 'Demander un accès | Scaniha',
    description: 'Demandez votre menu QR et programme de fidélité — notre équipe vous accompagne.',
    url: 'https://scaniha.com/business-request',
    siteName: 'Scaniha',
    type: 'website',
  },
  twitter: {
    images: ['/og-scaniha.jpg'],
    card: 'summary_large_image',
    title: 'Demander un accès | Scaniha',
    description: 'Demandez votre menu QR et programme de fidélité — notre équipe vous accompagne.',
  },
}

export default async function BusinessRequestPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string; source?: string }>
}) {
  const sp = (await searchParams) || {}
  // When the super-admin has opened direct self-signup, send visitors to /signup
  // instead of the request form (mirror of the /signup → /business-request gate).
  if (await isSelfSignupEnabled()) {
    redirect(sp.plan ? `/signup?plan=${encodeURIComponent(sp.plan)}` : '/signup')
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FEFEFE] px-6 py-10" dir="ltr">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <Link href="/" className="mx-auto mb-8 block w-fit">
          <Image src="/logo.png" alt="Scaniha" width={140} height={46} className="h-11 w-auto" priority />
        </Link>

        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-zinc-900">Lancez votre établissement</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Laissez vos coordonnées — notre équipe configure tout et vous accompagne au démarrage.
          </p>
        </div>

        <div className="mt-8">
          <BusinessRequestForm plan={sp.plan} source={sp.source} />
        </div>

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
