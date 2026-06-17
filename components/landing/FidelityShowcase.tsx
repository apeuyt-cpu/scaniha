import Image from 'next/image'
import cardShot from '../../public/landing/fidelity/card.png'
import wheelShot from '../../public/landing/fidelity/wheel.png'
import rewardsShot from '../../public/landing/fidelity/rewards.png'

// Real mobile screenshots of the live fidelity experience, shown in phone frames.
const SCREENS = [
  { src: cardShot, title: 'La carte', desc: '10 points offerts à l’inscription — juste un numéro, sans application.', raised: false },
  { src: wheelShot, title: 'La roue', desc: 'Un tour offert où tout le monde gagne — café, remise, dessert.', raised: true },
  { src: rewardsShot, title: 'La boutique', desc: 'Les points se transforment en récompenses que vous définissez.', raised: false },
] as const

function Phone({ src, alt, raised, delay }: { src: typeof cardShot; alt: string; raised: boolean; delay: number }) {
  return (
    <div className={`mx-auto w-[228px] sm:w-[248px] ${raised ? 'lg:-translate-y-8' : ''}`}>
      <div
        className="float-img overflow-hidden rounded-[2.4rem] border border-zinc-200 bg-zinc-900 p-2 shadow-2xl shadow-orange-900/15 ring-1 ring-black/5"
        style={{ animationDelay: `${delay}s` }}
      >
        <div className="aspect-[39/73] overflow-hidden rounded-[1.9rem] bg-white">
          <Image src={src} alt={alt} sizes="248px" className="h-full w-full object-cover object-top" placeholder="blur" />
        </div>
      </div>
    </div>
  )
}

export default function FidelityShowcase() {
  return (
    <div
      className="flex snap-x snap-mandatory gap-7 overflow-x-auto px-4 pt-14 pb-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:justify-center lg:overflow-visible lg:px-0"
    >
      {SCREENS.map((s, i) => (
        <figure
          key={s.title}
          className="reveal w-[228px] shrink-0 snap-center sm:w-[248px]"
          style={{ transitionDelay: `${i * 130}ms` }}
        >
          <Phone src={s.src} alt={`${s.title} — programme de fidélité Scaniha sur smartphone`} raised={s.raised} delay={i * 1.4} />
          <figcaption className={`mx-auto mt-6 text-center ${s.raised ? 'lg:-translate-y-8' : ''}`}>
            <h3 className="text-lg font-extrabold tracking-tight text-zinc-900">{s.title}</h3>
            <p className="mx-auto mt-1.5 max-w-[15rem] text-sm leading-relaxed text-zinc-600">{s.desc}</p>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
