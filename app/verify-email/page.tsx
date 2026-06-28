import type { Metadata } from 'next'
import VerifyEmailForm from '@/components/auth/VerifyEmailForm'
import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Vérification | Scaniha - Créateur de menus QR',
  description: 'Vérifiez votre adresse email pour activer votre compte Scaniha.',
}

export default async function VerifyEmailPage({ searchParams }: { searchParams?: Promise<{ email?: string }> }) {
  const sp = await searchParams

  return (
    <div className="flex min-h-screen flex-col bg-[#FEFEFE] px-6 py-10" dir="ltr">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <Link href="/" className="mx-auto mb-8 block w-fit">
          <Image src="/logo.png" alt="Scaniha" width={140} height={46} className="h-11 w-auto" priority />
        </Link>

        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-zinc-900">Vérifiez votre email</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Entrez le code à 6 chiffres envoyé à votre adresse email.
          </p>
        </div>

        <div className="mt-8">
          <VerifyEmailForm initialEmail={sp?.email || ''} />
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
