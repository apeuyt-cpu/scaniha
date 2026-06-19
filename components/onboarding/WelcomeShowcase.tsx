'use client'

import Link from 'next/link'
import Image from 'next/image'
import FidelityShowcase from '@/components/landing/FidelityShowcase'
import { DESIGNS, Thumb } from '@/components/admin/MenuDesignPicker'

const ORANGE = '#F47B20'
const GRAD = 'linear-gradient(135deg, #FB8B2A, #EF6311)'
const DEMO_IMGS = ['coffee', 'pizza', 'salad', 'dessert', 'drink', 'pasta']

const cta = 'inline-block rounded-2xl px-7 py-3.5 text-base font-bold text-white shadow-lg transition active:scale-[0.99]'

/**
 * First-run showcase shown right after signup (SignupForm redirects to /welcome).
 * A clean, no-login tour: the demo menu we seeded, the 4 designs, the loyalty
 * program — then a button into the dashboard. Client component because it reuses
 * the client-side design thumbnails (Thumb/DESIGNS). Existing assets only → no
 * extra data/storage.
 */
export default function WelcomeShowcase() {
  return (
    <main className="min-h-screen bg-[#FAF8F5]">
      {/* Hero */}
      <section className="px-5 pt-14 pb-6 text-center">
        <Image src="/logo2.webp" alt="Scaniha" width={150} height={44} className="mx-auto h-9 w-auto" priority />
        <h1 className="mx-auto mt-8 max-w-2xl text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-[2.7rem] sm:leading-[1.1]">
          Bienvenue ! Votre établissement est prêt 🎉
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-zinc-600">
          Tout est déjà configuré — voici un aperçu de ce que Scaniha fait pour vous. Vous n’avez plus qu’à personnaliser.
        </p>
        <Link href="/admin" className={`${cta} mt-8`} style={{ backgroundImage: GRAD, boxShadow: `0 16px 34px -12px ${ORANGE}` }}>
          Aller à mon tableau de bord →
        </Link>
      </section>

      {/* Demo menu already filled */}
      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>Votre menu</span>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">Un menu déjà rempli, avec photos</h2>
          <p className="mx-auto mt-3 max-w-xl text-zinc-600">
            On a ajouté un menu de démonstration — catégories et plats illustrés. Changez les noms, les prix et les photos quand vous voulez, ou repartez de zéro en un clic.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {DEMO_IMGS.map((n) => (
            <div key={n} className="aspect-square overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5">
              <Image src={`/demo-menu/${n}.webp`} alt="" width={300} height={300} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      </section>

      {/* The 4 modern designs */}
      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>Le design</span>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">4 looks modernes, en un clic</h2>
          <p className="mx-auto mt-3 max-w-xl text-zinc-600">
            Changez l’apparence de votre menu à tout moment. Chaque design s’adapte automatiquement à votre couleur et à votre logo.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {DESIGNS.map((d) => (
            <div key={d.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
              <div className="aspect-[3/4] overflow-hidden rounded-xl ring-1 ring-zinc-100">
                <Thumb kind={d.kind} accent={ORANGE} gradient={GRAD} />
              </div>
              <p className="mt-2.5 text-center text-sm font-bold text-zinc-800">{d.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Loyalty program (logged-in screens) */}
      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>En option</span>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">Un programme de fidélité, si vous voulez</h2>
          <p className="mx-auto mt-3 max-w-xl text-zinc-600">
            Points, roue de la chance et récompenses — vos clients s’inscrivent avec juste leur numéro, sans application. Activez-le quand vous êtes prêt, depuis votre tableau de bord.
          </p>
        </div>
        <FidelityShowcase />
      </section>

      {/* Final CTA */}
      <section className="px-5 pb-20 pt-2 text-center">
        <Link href="/admin" className={cta} style={{ backgroundImage: GRAD, boxShadow: `0 16px 34px -12px ${ORANGE}` }}>
          C’est parti — gérer mon établissement →
        </Link>
      </section>
    </main>
  )
}
