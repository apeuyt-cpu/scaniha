import type { Metadata } from 'next'
import DesignLinkBar from '@/components/menu/DesignLinkBar'

// Send-ready gallery of the 4 menu designs (demo "Saveur" menu). Each opens
// full-screen at /menu/<n>. No account needed.
const DESIGNS = [
  { n: '1', label: 'Spécial du Jour', desc: 'Liste chaleureuse + plat à la une' },
  { n: '2', label: 'Liste Élégante', desc: 'Typographie serif, prix pointillés' },
  { n: '3', label: 'Vitrine Immersive', desc: 'Couverture plein écran, ambiance premium' },
  { n: '4', label: 'Terroir', desc: 'Bandeau catégories + cartes rondes, esprit artisanal' },
]

export const metadata: Metadata = {
  title: 'Les 4 designs de menu',
  robots: { index: false, follow: false },
}

export default function MenuGallery() {
  return (
    <div className="min-h-screen bg-zinc-100 px-4 py-10" dir="ltr">
      <div className="mx-auto max-w-[1400px]">
        <h1 className="text-2xl font-extrabold text-zinc-900 sm:text-3xl">Les 4 designs de menu</h1>
        <p className="mt-1 text-zinc-600">
          Le même menu présenté dans nos 4 designs — choisissez celui qui vous ressemble. Données de démonstration, aucun compte requis.
        </p>

        <div className="mt-6">
          <DesignLinkBar items={DESIGNS.map((d) => ({ n: d.n, label: d.label }))} />
        </div>

        <div className="mt-10 grid gap-10 sm:grid-cols-2 xl:grid-cols-4">
          {DESIGNS.map((d) => (
            <a key={d.n} href={`/menu/${d.n}`} className="group block">
              <div className="mb-3 text-center">
                <span className="text-sm font-bold text-zinc-700">Design {d.n} — {d.label}</span>
                <span className="block text-xs text-zinc-500">{d.desc}</span>
              </div>
              <div className="mx-auto w-[360px] max-w-full overflow-hidden rounded-[2.2rem] border-[10px] border-zinc-900 shadow-2xl transition group-hover:-translate-y-1 group-hover:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.4)]">
                {/* Non-interactive preview; click the card to open the live version. */}
                <iframe
                  src={`/menu/${d.n}`}
                  title={`Design ${d.n} — ${d.label}`}
                  loading="lazy"
                  tabIndex={-1}
                  className="pointer-events-none block h-[740px] w-full bg-white"
                />
              </div>
              <div className="mt-3 text-center text-sm font-semibold text-orange-600 group-hover:text-orange-700 group-hover:underline">
                Ouvrir en plein écran →
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
