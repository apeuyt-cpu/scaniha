import { requireOwner } from '@/lib/auth'
import { getActiveBusiness } from '@/lib/db/business'
import { ToastProvider } from '@/components/admin/kit/Toast'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Caisse POS',
  robots: { index: false, follow: false },
}

/**
 * POS terminal shell — full-screen, no admin sidebar (kiosk). Same auth/tenancy
 * contract as the admin (requireOwner + getActiveBusiness). The POS is a separate
 * product but reuses the Scaniha account as its organisation.
 */
export default async function PosLayout({ children }: { children: React.ReactNode }) {
  await requireOwner()
  await getActiveBusiness()
  return (
    <div className="admin-shell min-h-screen">
      <ToastProvider>{children}</ToastProvider>
    </div>
  )
}
