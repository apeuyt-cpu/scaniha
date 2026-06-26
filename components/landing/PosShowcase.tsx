import Link from 'next/link'

/**
 * Landing showcase for the NEW standalone POS product. Matches the landing
 * conventions (.landing scope, orange #F47B20, Tajawal, reveal animation, pill
 * badge + check bullets). The visual is a CSS faux-terminal — no image asset.
 */
const FEATURES = [
  'Écran de vente tactile — grille, panier, encaissement en quelques touches.',
  'Espèces, carte, rendu-monnaie automatique et ticket imprimé.',
  'Codes PIN par employé, rôles, plusieurs branches et statistiques de vente.',
  'Tourne sur VOTRE matériel — tablette ou PC — gardez votre imprimante.',
]

const DEMO = [
  { n: 'Express', p: '2,500' },
  { n: 'Cappuccino', p: '3,500' },
  { n: 'Croissant', p: '2,200' },
  { n: 'Sandwich', p: '6,000' },
  { n: 'Salade', p: '9,500' },
  { n: 'Pizza', p: '12,000' },
]

export default function PosShowcase() {
  return (
    <section className="bg-white">
      <div className="reveal mx-auto max-w-[1240px] px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Copy */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3.5 py-1.5 text-sm font-bold text-orange-700">
              Nouveau · Produit séparé
            </span>
            <h2 className="headline mt-5 text-3xl font-extrabold leading-[1.12] text-zinc-900 sm:text-4xl lg:text-5xl">
              La caisse <span className="text-orange-500">qui tourne sur votre matériel</span>
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-600">
              Scaniha POS transforme votre tablette ou votre PC en caisse enregistreuse moderne —
              ventes, tickets, équipe et plusieurs points de vente. Pas de boîtier imposé : vous
              gardez votre matériel, vous payez juste le logiciel.
            </p>
            <ul className="mt-6 space-y-3">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                  </span>
                  <span className="text-base leading-relaxed text-zinc-700">{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/business-request" className="btn-shine inline-flex items-center justify-center rounded-xl bg-orange-500 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600">
                Demander la caisse POS →
              </Link>
              <Link href="/pricing" className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 py-3.5 text-base font-bold text-zinc-700 transition hover:bg-zinc-50">
                Voir les tarifs
              </Link>
            </div>
          </div>

          {/* Faux terminal */}
          <div className="float-img">
            <div className="mx-auto max-w-md rounded-3xl border border-[rgba(26,26,26,0.08)] bg-white p-4 shadow-[0_18px_48px_rgba(26,26,26,0.12)]">
              <div className="flex items-center justify-between px-1 pb-3">
                <span className="text-sm font-bold text-zinc-900">Caisse</span>
                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-600">Table 4</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DEMO.map((d) => (
                  <div key={d.n} className="rounded-xl border border-zinc-100 bg-[#FEFCFA] p-2.5 text-left">
                    <p className="truncate text-[13px] font-semibold text-zinc-800">{d.n}</p>
                    <p className="mt-1 text-[12px] font-bold text-orange-600">{d.p}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-2xl bg-zinc-50 p-3">
                <div className="flex items-center justify-between text-sm text-zinc-500"><span>Sous-total</span><span className="tabular-nums">15,500</span></div>
                <div className="mt-1 flex items-center justify-between"><span className="text-base font-bold text-zinc-900">Total</span><span className="text-lg font-extrabold tabular-nums text-zinc-900">15,500 TND</span></div>
                <div className="mt-3 rounded-xl bg-orange-500 py-3 text-center text-base font-bold text-white">Encaisser</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
