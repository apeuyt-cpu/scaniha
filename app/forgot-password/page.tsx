import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mot de passe oublié | Scaniha',
  description: 'Réinitialisez le mot de passe de votre compte Scaniha avec un code de vérification envoyé par email.',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FEFEFE] px-6 py-10" dir="ltr">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <Link href="/" className="mx-auto mb-8 block w-fit">
          <Image src="/logo.png" alt="Scaniha" width={140} height={46} className="h-11 w-auto" priority />
        </Link>

        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-zinc-900">Réinitialiser le mot de passe</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Entrez votre email, vérifiez le code reçu, puis choisissez un nouveau mot de passe.
          </p>
        </div>

        <div className="mt-8">
          <ForgotPasswordForm />
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Vous vous souvenez du mot de passe ?{' '}
          <Link href="/login" className="font-semibold text-orange-600 hover:text-orange-700">
            Connectez-vous
          </Link>
        </p>
      </div>
    </div>
  )
}

