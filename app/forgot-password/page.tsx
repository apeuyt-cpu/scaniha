import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Réinitialiser votre mot de passe | Scaniha',
  description: 'Réinitialisez votre mot de passe en vérifiant votre adresse email et en définissant un nouveau mot de passe sécurisé.',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FEFEFE] px-6 py-10" dir="ltr">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <Link href="/" className="mx-auto mb-8 block w-fit">
          <Image src="/logo.png" alt="Scaniha" width={140} height={46} className="h-11 w-auto" priority />
        </Link>

        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-zinc-900">Mot de passe oublié</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Réinitialisez votre mot de passe en quelques étapes simples et sécurisées.
          </p>
        </div>

        <div className="mt-8">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  )
}
