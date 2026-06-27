import Link from 'next/link'

// Shown in the owner admin when they reach a product page their plan doesn't
// include (e.g. a menu-only café deep-linking to /admin/fidelite). The nav
// already hides these, but this is the route-level enforcement + a clean upsell.

export type GuardedProduct = 'menu' | 'fidelite' | 'ordering' | 'pos'

const COPY: Record<GuardedProduct, { title: string; message: string }> = {
  menu: {
    title: 'Le menu QR n’est pas inclus dans votre formule',
    message: 'Votre compte est configuré en mode Fidélité uniquement. Contactez Scaniha pour ajouter le menu QR.',
  },
  fidelite: {
    title: 'La fidélité n’est pas incluse dans votre formule',
    message: 'Le programme de fidélité (points, roue, récompenses) n’est pas activé sur votre compte. Contactez Scaniha pour l’ajouter.',
  },
  ordering: {
    title: 'La commande à table nécessite un menu',
    message: 'La commande à table fonctionne avec le menu QR. Contactez Scaniha pour activer le menu sur votre compte.',
  },
  pos: {
    title: 'La caisse POS n’est pas activée',
    message: 'La caisse POS est un produit séparé. Contactez Scaniha pour l’activer sur votre compte.',
  },
}

export default function ProductLocked({ product }: { product: GuardedProduct }) {
  const c = COPY[product]
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand-soft)]" aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
          <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
          <circle cx="12" cy="15.5" r="1.4" fill="var(--brand)" stroke="none" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-[var(--ink)]">{c.title}</h1>
      <p className="mt-2 text-[var(--muted)]">{c.message}</p>
      <Link
        href="/contact"
        className="mt-6 inline-flex min-h-[44px] items-center rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-600)]"
      >
        Contacter Scaniha
      </Link>
    </div>
  )
}
