import Link from 'next/link'
import { requireOwner } from '@/lib/auth'
import { getActiveBusiness } from '@/lib/db/business'
import { isOrderingLive } from '@/lib/design-settings'
import PageShell from '@/components/admin/ui/PageShell'
import OrdersConsole from '@/components/admin/orders/OrdersConsole'

export default async function CommandesPage() {
  await requireOwner()
  const business = await getActiveBusiness()

  if (!business) {
    return (
      <PageShell title="Commandes" width="3xl">
        <p className="text-zinc-500">Établissement introuvable</p>
      </PageShell>
    )
  }

  // Ordering must be enabled (and a QR key minted) before the console is useful.
  if (!isOrderingLive(business)) {
    return (
      <PageShell title="Commandes" width="3xl">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"
            aria-hidden="true"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 7h14l-1.2 11.4a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7Z" />
              <path d="M9 7V5a3 3 0 0 1 6 0v2" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-zinc-900">La commande à table n'est pas activée</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-zinc-500">
            Activez la commande à table et générez les QR codes pour commencer à recevoir
            les commandes de vos clients.
          </p>
          <Link
            href="/admin/commandes/reglages"
            className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Activer la commande à table
          </Link>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell
      title="Commandes"
      subtitle="Suivez et validez les commandes de vos tables en temps réel."
      width="3xl"
      action={
        <Link
          href="/admin/commandes/reglages"
          aria-label="Réglages des commandes"
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
          Réglages
        </Link>
      }
    >
      <OrdersConsole />
    </PageShell>
  )
}
