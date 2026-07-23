import Link from 'next/link'
import OfferCountdown from './OfferCountdown'

type Variant = 'light' | 'popular' | 'dark'

interface Plan {
  variant: Variant
  name: string
  price: string
  /** Anchor price shown struck-through (marketing). */
  oldPrice?: string
  /** Discount badge text, e.g. "−60%". */
  discount?: string
  period: string
  href: string
  badge?: string
  save?: string
  note?: string
}

// ── Produit 1 : Menu QR ──────────────────────────────────────────────
const FEATURES_QR = [
  'Articles et catégories illimités',
  '8 designs de menu premium',
  'QR code personnalisé',
  'Modifications en temps réel',
  'Statistiques de consultation',
  'Support prioritaire',
]

const qrPlans: Plan[] = [
  { variant: 'popular', name: '1 an', price: '150', oldPrice: '250', discount: '−40%', period: 'par an', href: '/business-request?plan=1year', badge: 'Le plus populaire' },
  { variant: 'dark', name: 'À vie', price: '250', oldPrice: '600', discount: '−58%', period: 'accès à vie — sans abonnement', note: 'Réglez une seule fois, plus jamais d’abonnement.', href: '/business-request?plan=lifetime', badge: 'Meilleure offre' },
]

// ── Produit 2 : Programme de fidélité (séparé) ───────────────────────
const FEATURES_FIDELITY = [
  'Points de fidélité à chaque achat',
  'Récompenses personnalisées',
  'Roue de la chance (activable ou non)',
  'Carte de fidélité numérique',
  'Codes de retrait sécurisés',
  'Statistiques clients',
]

const fidelityPlans: Plan[] = [
  { variant: 'light', name: 'Mensuel', price: '45', period: 'par mois', href: '/business-request?plan=fidelity_month' },
  { variant: 'popular', name: '3 mois', price: '90', period: 'pour 3 mois', href: '/business-request?plan=fidelity_3months', badge: 'Le plus populaire' },
  { variant: 'dark', name: '1 an', price: '150', period: 'par an', note: 'Renouvelable chaque année — aucun prélèvement automatique.', href: '/business-request?plan=fidelity_year', badge: 'Meilleure offre', save: 'Économisez 390 TND' },
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

function PlanCard({ plan, features }: { plan: Plan; features: string[] }) {
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

  // Vivid, high-contrast discount badge per card background.
  const discountPill =
    variant === 'popular'
      ? 'bg-white text-orange-600'
      : variant === 'dark'
        ? 'bg-amber-300 text-zinc-900'
        : 'bg-red-500 text-white'

  return (
    <div className={`relative flex flex-col rounded-3xl p-8 ${shell}`}>
      {plan.badge && (
        <span
          className={`absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold shadow-md ${
            variant === 'popular' ? 'bg-white text-orange-600' : 'bg-gradient-to-r from-amber-300 to-yellow-400 text-zinc-900'
          }`}
        >
          {plan.badge}
        </span>
      )}

      <h3 className="text-sm font-semibold uppercase tracking-wide opacity-70">{plan.name}</h3>

      {(plan.oldPrice || plan.discount) && (
        <p className="mt-3 flex items-center gap-2">
          {plan.oldPrice && <span className={`text-xl font-bold line-through ${unitColor}`}>{plan.oldPrice} TND</span>}
          {plan.discount && (
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold shadow-sm ${discountPill}`}>{plan.discount}</span>
          )}
        </p>
      )}

      <p className={`${plan.oldPrice || plan.discount ? 'mt-1' : 'mt-3'} flex items-baseline gap-1.5`}>
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
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${savePill}`}>
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
            <span>{plan.save}</span>
          </span>
        )}
      </div>

      <hr className={`mt-6 border-t ${divider}`} />

      <ul className="mb-8 mt-6 space-y-3.5">
        {features.map((f) => (
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
    <div className="mx-auto max-w-5xl space-y-16">
      <OfferCountdown />

      {/* ── Produit 1 : Menu QR ── */}
      <div>
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">Le menu QR</span>
          <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900">Votre carte numérique</h3>
          <p className="mt-2 text-zinc-500">Un menu élégant en un scan, modifiable à tout moment.</p>
        </div>
        <div className="mx-auto grid max-w-3xl grid-cols-1 items-stretch gap-7 pt-4 md:grid-cols-2">
          {qrPlans.map((plan) => (
            <PlanCard key={plan.variant} plan={plan} features={FEATURES_QR} />
          ))}
        </div>
        <div className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-2xl border-2 border-orange-300 bg-orange-50 px-5 py-4 text-left shadow-sm">
          <svg className="w-5 h-5 shrink-0 text-orange-600 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p className="text-sm font-semibold leading-relaxed text-orange-900">
            Tarifs de la plateforme uniquement — <span className="font-extrabold underline decoration-orange-400 decoration-2 underline-offset-2">supports de table et stickers QR non inclus</span> (en option lors de l&apos;abonnement).
          </p>
        </div>
      </div>

      {/* ── Produit 2 : Programme de fidélité (séparé) ── */}
      <div>
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-700">
            Produit séparé
          </span>
          <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-zinc-900">Le programme de fidélité</h3>
          <p className="mt-2 text-zinc-500">
            Points, récompenses et roue de la chance pour faire revenir vos clients. Un produit à part — prenez-le avec votre menu QR ou tout seul.
          </p>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-stretch gap-7 pt-4 md:grid-cols-3">
          {fidelityPlans.map((plan) => (
            <PlanCard key={plan.variant} plan={plan} features={FEATURES_FIDELITY} />
          ))}
        </div>
      </div>
    </div>
  )
}
