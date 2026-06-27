import { requireSuperAdmin } from '@/lib/auth'
import { listBusinessRequests } from '@/lib/db/business-requests'
import DemandesQueue from '@/components/super-admin/DemandesQueue'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Demandes | Scaniha',
  robots: { index: false, follow: false },
}

export default async function DemandesPage() {
  await requireSuperAdmin()

  let rows: Awaited<ReturnType<typeof listBusinessRequests>> = []
  try {
    rows = await listBusinessRequests()
  } catch (e: any) {
    console.error('[super-admin/demandes] load error:', e?.message)
  }

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-bold text-zinc-900">Demandes d’accès</h1>
        <p className="mt-1 text-sm text-zinc-500">Prospects à recontacter, puis à convertir en compte établissement.</p>
      </header>
      <DemandesQueue initial={rows} />
    </div>
  )
}
