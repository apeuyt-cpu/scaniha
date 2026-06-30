import { requireSuperAdmin } from '@/lib/auth'
import { listBusinessRequests } from '@/lib/db/business-requests'
import { isSelfSignupEnabled } from '@/lib/db/platform-settings'
import DemandesQueue from '@/components/super-admin/DemandesQueue'
import SignupModeCard from '@/components/super-admin/SignupModeCard'
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
  const selfSignup = await isSelfSignupEnabled().catch(() => false)

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-bold text-zinc-900">Demandes d’accès</h1>
        <p className="mt-1 text-sm text-zinc-500">Prospects à recontacter, puis à convertir en compte établissement.</p>
      </header>
      <SignupModeCard initial={selfSignup} />
      <DemandesQueue initial={rows} />
    </div>
  )
}
