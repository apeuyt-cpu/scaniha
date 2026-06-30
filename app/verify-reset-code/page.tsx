import type { Metadata } from 'next'
import VerifyResetCodeForm from '@/components/auth/VerifyResetCodeForm'
import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Vérifier votre email | Scaniha - Créateur de menus QR',
  description: 'Vérifiez votre adresse email pour réinitialiser votre mot de passe.',
  robots: { index: false, follow: false },
}

export default function VerifyResetCodePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FEFEFE] px-6 py-10" dir="ltr">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        {/* Logo */}
        <Link href="/" className="mx-auto mb-8 block w-fit">
          <Image src="/logo.png" alt="Scaniha" width={140} height={46} className="h-11 w-auto" priority />
        </Link>

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-zinc-900">Vérifiez votre email</h1>
          <p className="mt-1.5 text-sm text-zinc-500">Nous avons envoyé un code de vérification à votre adresse email.</p>
        </div>

        {/* Form */}
        <div className="mt-8">
          <VerifyResetCodeForm />
        </div>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-zinc-500">
          Vous n'avez pas reçu le code&nbsp;?{' '}
          <Link href="/forgot-password" className="font-semibold text-orange-600 hover:text-orange-700">
            Renvoyer l'email
          </Link>
        </p>
      </div>
    </div>
  )
}
