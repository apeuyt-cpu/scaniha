import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Page introuvable | Scaniha',
  description: 'La page que vous cherchez n\'existe pas ou a été déplacée. Revenez à l\'accueil ou créez votre menu QR gratuitement.',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FEFEFE] px-4" dir="ltr">
      <div className="mx-auto max-w-md text-center">
        <p className="bg-gradient-to-r from-[#F47B20] to-[#F5B82E] bg-clip-text text-7xl font-extrabold tracking-tight text-transparent sm:text-8xl">
          404
        </p>
        <h1 className="mt-4 text-2xl font-bold text-zinc-900 sm:text-3xl">
          Cette page est introuvable
        </h1>
        <p className="mt-3 text-base leading-relaxed text-zinc-600">
          La page que vous cherchez n&apos;existe pas, a été déplacée, ou l&apos;adresse est incorrecte.
          Pas d&apos;inquiétude — vous pouvez repartir d&apos;ici.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="w-full rounded-xl bg-gradient-to-r from-[#F47B20] to-[#F5B82E] px-7 py-3.5 text-center text-base font-bold text-white shadow-lg shadow-orange-500/20 transition hover:opacity-95 sm:w-auto"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/business-request"
            className="w-full rounded-xl border border-zinc-300 bg-white px-7 py-3.5 text-center text-base font-semibold text-zinc-800 transition hover:border-orange-400 hover:text-orange-600 sm:w-auto"
          >
            Créer mon menu QR
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-zinc-500">
          <Link href="/features" className="transition hover:text-orange-600">Fonctionnalités</Link>
          <span aria-hidden="true" className="text-zinc-300">·</span>
          <Link href="/pricing" className="transition hover:text-orange-600">Tarifs</Link>
          <span aria-hidden="true" className="text-zinc-300">·</span>
          <Link href="/contact" className="transition hover:text-orange-600">Contact</Link>
        </div>
      </div>
    </div>
  )
}
