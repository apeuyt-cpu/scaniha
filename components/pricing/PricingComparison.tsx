import Link from 'next/link'

type Variant = 'light' | 'popular' | 'dark'

interface Plan {
  variant: Variant
  name: string
  price: string
  period: string
  href: string
  badge?: string
  save?: string
  note?: string
}

// Every plan is the same product — only the duration and price differ.
// So all cards share one feature list (matches "toutes les fonctionnalités incluses").
const FEATURES = [
  'Articles et catégories illimités',
  '8 designs de menu premium',
  'QR code personnalisé',
  'Liens vers les réseaux sociaux',
  'Statistiques de consultation',
  'Support prioritaire',
]

const plans: Plan[] = [
  {
    variant: 'light',
    name: '6 mois',
    price: '150',
    period: 'pour 6 mois',
    href: '/signup?plan=6months',
  },
  {
    variant: 'popular',
    name: '1 an',
    price: '250',
    period: 'par an',
    href: '/signup?plan=1year',
    badge: 'Le plus populaire',
    save: 'Économisez 50 TND',
  },
  {
    variant: 'dark',
    name: 'À vie',
    price: '600',
    period: 'accès à vie — sans abonnement',
    note: 'Réglez en une fois (600 TND) ou en 2 fois (2 × 300 TND), sans frais.',
    href: '/signup?plan=lifetime',
    badge: 'Meilleure offre',
    save: 'Économisez 300 TND',
  },
]

function Check({ variant }: { variant: Variant }) {
  const cls =
    variant === 'popular'
      ? 'bg-white/20 text-white'
      : variant === 'dark'
        ? 'bg-amber-400/20 text-amber-300'
        : 'bg-green-100 text-green-600'
  return (
    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${cls}`}>
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3 w-3">
        <path d="M5 10.5l3.2 3.2L15 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function PlanCard({ plan }: { plan: Plan }) {
  const { variant } = plan

  const shell =
    variant === 'light'
      ? 'bg-white text-zinc-900 ring-1 ring-zinc-200/80 shadow-sm'
      : variant === 'popular'
        ? 'bg-gradient-to-b from-orange-400 to-orange-500 text-white shadow-2xl shadow-orange-500/30 ring-1 ring-orange-300 md:z-10 md:scale-[1.04]'
        : 'bg-gradient-to-b from-zinc-800 to-zinc-950 text-white ring-1 ring-amber-500/25 shadow-xl'

  const priceColor = variant === 'dark' ? 'text-amber-400' : variant === 'popular' ? 'text-white' : 'text-zinc-900'
  const unitColor = variant === 'popular' ? 'text-white/80' : variant === 'dark' ? 'text-amber-400/70' : 'text-zinc-400'
  const periodColor = variant === 'popular' ? 'text-white/80' : 'text-zinc-400'
  const featureColor = variant === 'light' ? 'text-zinc-700' : 'text-white/90'
  const divider = variant === 'light' ? 'border-zinc-100' : 'border-white/10'

  const savePill =
    variant === 'popular'
      ? 'bg-white/15 text-white ring-1 ring-white/30'
      : 'bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/40'

  return (
    <div className={`relative flex flex-col rounded-3xl p-8 ${shell}`}>
      {plan.badge && (
        <span
          className={`absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold shadow-md ${
            variant === 'popular'
              ? 'bg-white text-orange-600'
              : 'bg-gradient-to-r from-amber-300 to-yellow-400 text-zinc-900'
          }`}
        >
          {plan.badge}
        </span>
      )}

      <h3 className="text-sm font-semibold uppercase tracking-wide opacity-70">{plan.name}</h3>

      <p className="mt-3 flex items-baseline gap-1.5">
        <span className={`text-5xl font-extrabold tracking-tight ${priceColor}`}>{plan.price}</span>
        <span className={`text-lg font-bold ${unitColor}`}>TND</span>
      </p>
      <p className={`mt-1 text-sm ${periodColor}`}>{plan.period}</p>
      {plan.note && (
        <p className={`mt-1.5 text-xs leading-relaxed ${variant === 'dark' ? 'text-amber-200/70' : variant === 'popular' ? 'text-white/70' : 'text-zinc-400'}`}>
          {plan.note}
        </p>
      )}

      <div className="mt-4 h-7">
        {plan.save && (
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${savePill}`}>
            <span aria-hidden="true">★</span> {plan.save}
          </span>
        )}
      </div>

      <hr className={`mt-6 border-t ${divider}`} />

      <ul className="mb-8 mt-6 space-y-3.5">
        {FEATURES.map((f) => (
          <li key={f} className={`flex items-center gap-3 text-sm font-medium ${featureColor}`}>
            <Check variant={variant} />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href={plan.href}
        className={`btn-shine mt-auto block rounded-2xl py-3.5 text-center text-base font-bold transition-colors ${
          variant === 'light'
            ? 'bg-zinc-900 text-white hover:bg-zinc-800'
            : variant === 'popular'
              ? 'bg-white text-orange-600 hover:bg-orange-50'
              : 'bg-gradient-to-r from-amber-300 to-yellow-400 text-zinc-900 hover:from-amber-400 hover:to-yellow-500'
        }`}
      >
        Choisir ce forfait
      </Link>
    </div>
  )
}

export default function PricingComparison() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid grid-cols-1 items-stretch gap-7 pt-4 md:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.variant} plan={plan} />
        ))}
      </div>

      {/* Scope note — software only (highlighted so it can't be missed) */}
      <div className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-2xl border-2 border-orange-300 bg-orange-50 px-5 py-4 text-left shadow-sm">
        <span aria-hidden="true" className="mt-0.5 text-lg leading-none">ℹ️</span>
        <p className="text-sm font-semibold leading-relaxed text-orange-900">
          Tarifs de la plateforme uniquement — <span className="font-extrabold underline decoration-orange-400 decoration-2 underline-offset-2">supports de table et stickers QR non inclus</span> (en option lors de l&apos;abonnement).
        </p>
      </div>
    </div>
  )
}
