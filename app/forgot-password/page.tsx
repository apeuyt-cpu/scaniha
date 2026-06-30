import type { Metadata } from 'next'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'
import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Réinitialiser le mot de passe | Scaniha - Créateur de menus QR',
  description: 'Réinitialisez votre mot de passe pour accéder à votre compte Scaniha.',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FEFEFE] px-6 py-10" dir="ltr">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        {/* Logo */}
        <Link href="/" className="mx-auto mb-8 block w-fit">
          <Image src="/logo.png" alt="Scaniha" width={140} height={46} className="h-11 w-auto" priority />
        </Link>

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-zinc-900">Réinitialiser votre mot de passe</h1>
          <p className="mt-1.5 text-sm text-zinc-500">Nous vous enverrons un code de vérification par email.</p>
        </div>

        {/* Form */}
        <div className="mt-8">
          <ForgotPasswordForm />
        </div>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-zinc-500">
          Vous vous souvenez de votre mot de passe&nbsp;?{' '}
          <Link href="/login" className="font-semibold text-orange-600 hover:text-orange-700">
            Retourner à la connexion
          </Link>
        </p>
      </div>
    </div>
  )
}
