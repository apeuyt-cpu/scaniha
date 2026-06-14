// Public preview hub for the 8 menu design templates.
// No account / auth needed — uses demo data (lib/demo-menu.ts).
// Live at /menu-designs ; each design also opens full-screen at /menu-designs/<n>.

const designs = [
  { n: '1', label: 'Spécial du Jour', desc: 'Liste chaleureuse + plat surprise' },
  { n: '6', label: 'Liste Élégante', desc: 'Typographie serif, prix pointillés' },
  { n: '11', label: 'Vitrine Immersive', desc: 'Couverture plein écran, ambiance premium' },
  { n: '12', label: 'Terroir', desc: 'Bandeau catégories + cartes rondes, esprit artisanal' },
  { n: '13', label: 'Classique', desc: 'Thème classique chaleureux' },
  { n: '14', label: 'Minimal', desc: 'Épuré, liste compacte par catégories' },
  { n: '15', label: 'Sombre', desc: 'Fond sombre, accents dorés' },
]

export const metadata = {
  title: 'Aperçu des designs de menu — Scaniha',
  robots: { index: false, follow: false },
}

export default function MenuDesignsIndex() {
  return (
    <div className="min-h-screen bg-zinc-100 px-4 py-10" dir="ltr">
      <div className="mx-auto max-w-[1400px]">
        <h1 className="text-2xl font-extrabold text-zinc-900 sm:text-3xl">Designs de menu</h1>
        <p className="mt-1 text-zinc-600">
          Aperçu des modèles de menu client avec des données de démonstration — aucun compte requis.
        </p>

        <div className="mt-10 grid gap-10 sm:grid-cols-2 xl:grid-cols-4">
          {designs.map((d) => (
            <a key={d.n} href={`/menu-designs/${d.n}`} className="group block">
              <div className="mb-3 text-center">
                <span className="text-sm font-bold text-zinc-700">Design {d.n} — {d.label}</span>
                <span className="block text-xs text-zinc-500">{d.desc}</span>
              </div>
              <div className="mx-auto w-[360px] max-w-full overflow-hidden rounded-[2.2rem] border-[10px] border-zinc-900 shadow-2xl transition group-hover:-translate-y-1 group-hover:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.4)]">
                {/* Non-interactive preview; click the card to open the live version. */}
                <iframe
                  src={`/menu-designs/${d.n}`}
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

        <p className="mt-12 text-center text-xs text-zinc-400">
          Liens directs&nbsp;: <code className="rounded bg-white px-1.5 py-0.5">/menu-designs/1</code> …{' '}
          <code className="rounded bg-white px-1.5 py-0.5">/menu-designs/10</code>
        </p>
      </div>
    </div>
  )
}
