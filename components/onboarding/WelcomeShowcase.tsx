'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { ReactNode } from 'react'
import FidelityShowcase from '@/components/landing/FidelityShowcase'
import { DESIGNS, Thumb } from '@/components/admin/MenuDesignPicker'
import { DEMO_MENU } from '@/lib/demo-menu-seed'

const ORANGE = '#F47B20'
const GRAD = 'linear-gradient(135deg, #FB8B2A, #EF6311)'
const INK = '#1A1410'
const MUT = '#7A736B'

const VIBES: Record<string, string> = { design1: 'Épuré', design6: 'Élégant', design11: 'Immersif', design12: 'Terroir' }

// Three demo dishes for the menu preview card (kept in sync with the seed).
const PREVIEW = [DEMO_MENU[0]?.items[0], DEMO_MENU[3]?.items[0], DEMO_MENU[4]?.items[0]].filter(Boolean) as {
  name: string; description: string; price: number; image: string
}[]

const fmtPrice = (p: number) => `${Number.isInteger(p) ? p : p.toFixed(1).replace('.', ',')} TND`

function SectionHead({ kicker, title, sub }: { kicker: string; title: string; sub?: ReactNode }) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <span className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: ORANGE }}>{kicker}</span>
      <h2 className="mt-2.5 text-[1.7rem] font-extrabold leading-tight tracking-tight sm:text-[2rem]" style={{ color: INK }}>{title}</h2>
      {sub && <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed" style={{ color: MUT }}>{sub}</p>}
    </div>
  )
}

const CTA = ({ children }: { children: ReactNode }) => (
  <Link
    href="/admin"
    className="inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-base font-bold text-white shadow-lg transition active:scale-[0.98]"
    style={{ backgroundImage: GRAD, boxShadow: '0 18px 36px -14px rgba(239,99,17,0.55)' }}
  >
    {children}
  </Link>
)

/**
 * First-run showcase after signup — a clean, premium tour: the seeded menu (as a
 * real menu card), the 4 designs (framed previews), and the loyalty program, then
 * into the dashboard. Reuses existing assets only — no extra data/storage.
 */
export default function WelcomeShowcase() {
  return (
    <main style={{ backgroundColor: '#FAF8F5', color: INK }}>
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pt-16 pb-12 text-center sm:pt-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72" style={{ background: 'radial-gradient(58% 100% at 50% 0%, rgba(244,123,32,0.12), transparent 72%)' }} />
        <div className="relative mx-auto max-w-2xl">
          <Image src="/logo2.webp" alt="Scaniha" width={150} height={44} className="mx-auto h-8 w-auto" priority />
          <span className="mt-9 inline-block rounded-full bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] shadow-sm ring-1 ring-black/5" style={{ color: ORANGE }}>
            Bienvenue 🎉
          </span>
          <h1 className="mx-auto mt-5 max-w-xl text-[2.15rem] font-extrabold leading-[1.07] tracking-tight sm:text-[2.9rem]" style={{ color: INK }}>
            Votre établissement est prêt
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed" style={{ color: MUT }}>
            On a déjà tout préparé — menu, photos et design. Il ne reste qu’à le rendre vôtre.
          </p>
          <div className="mt-9">
            <CTA>Découvrir mon tableau de bord →</CTA>
          </div>
        </div>
      </section>

      {/* ── Menu preview (real menu card) ──────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-14">
        <SectionHead kicker="Votre menu" title="Déjà rempli, avec photos" sub="On a ajouté un menu d’exemple. Modifiez les noms, les prix et les photos — ou repartez de zéro en un clic." />
        <div className="mx-auto mt-9 max-w-md overflow-hidden rounded-[28px] bg-white shadow-[0_30px_60px_-28px_rgba(0,0,0,0.32)] ring-1 ring-black/[0.04]">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
            <span className="text-sm font-bold" style={{ color: INK }}>Notre carte</span>
            <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: ORANGE }}>Aperçu</span>
          </div>
          {PREVIEW.map((it, i) => (
            <div key={it.name} className={`flex items-center gap-4 px-5 py-3.5 ${i > 0 ? 'border-t border-zinc-50' : ''}`}>
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-1 ring-black/5">
                <Image src={it.image} alt="" width={120} height={120} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold" style={{ color: INK }}>{it.name}</p>
                <p className="truncate text-[13px]" style={{ color: MUT }}>{it.description}</p>
              </div>
              <span className="shrink-0 rounded-full px-3 py-1 text-sm font-bold text-white" style={{ backgroundImage: GRAD }}>{fmtPrice(it.price)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Designs (framed previews) ──────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-14">
        <SectionHead kicker="Le design" title="4 looks, un seul clic" sub="Changez l’apparence de votre menu quand vous voulez — chaque style reprend automatiquement votre couleur et votre logo." />
        <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {DESIGNS.map((d) => (
            <div key={d.id} className="group">
              <div className="overflow-hidden rounded-[1.6rem] bg-white p-1.5 shadow-[0_18px_40px_-22px_rgba(0,0,0,0.4)] ring-1 ring-black/5 transition duration-300 group-hover:-translate-y-1">
                <div className="aspect-[4/5] overflow-hidden rounded-[1.2rem]">
                  <Thumb kind={d.kind} accent={ORANGE} gradient={GRAD} />
                </div>
              </div>
              <div className="mt-3.5 text-center">
                <p className="text-sm font-bold" style={{ color: INK }}>{d.name}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: MUT }}>{VIBES[d.id]}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Loyalty (optional) ─────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pt-14 pb-6">
        <SectionHead kicker="En option" title="Un programme de fidélité" sub="Points, roue de la chance et récompenses — vos clients s’inscrivent avec juste leur numéro. Activez-le quand vous voulez." />
        <FidelityShowcase />
      </section>

      {/* ── Final CTA ──────────────────────────────────────── */}
      <section className="px-6 pb-20 pt-2">
        <div className="mx-auto max-w-md rounded-[28px] bg-white p-7 text-center shadow-[0_30px_60px_-30px_rgba(0,0,0,0.3)] ring-1 ring-black/[0.04]">
          <h3 className="text-xl font-extrabold tracking-tight" style={{ color: INK }}>Prêt à personnaliser ?</h3>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed" style={{ color: MUT }}>Votre tableau de bord vous attend — modifiez le menu, le design et partagez votre QR code.</p>
          <div className="mt-6">
            <CTA>C’est parti →</CTA>
          </div>
        </div>
      </section>
    </main>
  )
}
