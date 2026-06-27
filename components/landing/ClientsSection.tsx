import Image from 'next/image'
import Link from 'next/link'
import logo1 from '../../public/clients/logo-1.webp'
import logo2 from '../../public/clients/logo-2.webp'
import logo3 from '../../public/clients/logo-3.webp'
import logo4 from '../../public/clients/logo-4.webp'
import AnimatedShapes from '@/components/landing/AnimatedShapes'

const LOGOS = [
  { src: logo1, alt: 'BIZZ’ART' },
  { src: logo2, alt: 'Ciao' },
  { src: logo3, alt: 'Machewi Mahmoud Bleha' },
  { src: logo4, alt: 'Abou Nawes' },
]

export default function ClientsSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FEFEFE] via-[#FEFEFE] to-[#FEFEFE] py-20 sm:py-28 lg:py-32" dir="ltr">
      <AnimatedShapes />
      <div className="relative z-10 mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(240px,1fr)_minmax(0,1.9fr)] lg:gap-16">
          {/* Heading block */}
          <div className="text-center lg:text-left">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-600">Établissements partenaires</p>
            <h2 className="mt-4 text-4xl font-extrabold leading-[1.1] text-zinc-900 sm:text-5xl">
              Ils nous font confiance
            </h2>
            <div className="mx-auto mt-5 h-1 w-16 rounded-full bg-orange-500 lg:mx-0" />
            <p className="mx-auto mt-5 max-w-sm text-base text-zinc-600 sm:text-lg lg:mx-0">
              Nous sommes fiers de collaborer avec des établissements qui nous inspirent.
            </p>
          </div>

          {/* Logos — equal weight, grayscale until hover */}
          <div>
            {/* Desktop / tablet: one balanced row */}
            <div className="hidden items-center justify-between gap-8 md:flex">
              {LOGOS.map((l) => (
                <Image
                  key={l.alt}
                  src={l.src}
                  alt={l.alt}
                  title={l.alt}
                  sizes="180px"
                  className="h-auto max-h-[104px] w-auto max-w-[210px] object-contain opacity-90 grayscale-[25%] transition duration-300 hover:opacity-100 hover:grayscale-0"
                />
              ))}
              <Link
                href="/business-request"
                className="flex h-[96px] w-[140px] shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 text-center text-sm font-semibold text-zinc-400 transition hover:border-orange-400 hover:text-orange-600"
              >
                Rejoignez-les
              </Link>
            </div>

            {/* Mobile: 2×2 grid + ghost tile */}
            <div className="grid grid-cols-2 items-center gap-6 md:hidden">
              {LOGOS.map((l) => (
                <div key={l.alt} className="flex items-center justify-center">
                  <Image
                    src={l.src}
                    alt={l.alt}
                    sizes="160px"
                    className="h-auto max-h-24 w-auto max-w-[170px] object-contain opacity-90 grayscale-[25%] transition duration-300 active:opacity-100 active:grayscale-0"
                  />
                </div>
              ))}
              <Link
                href="/business-request"
                className="col-span-2 flex h-12 items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 text-sm font-semibold text-zinc-400 transition hover:border-orange-400 hover:text-orange-600"
              >
                Rejoignez-les
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
