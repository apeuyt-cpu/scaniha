import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import SuperShell from '@/components/super-admin/shell/SuperShell'
import ActivityTracker from '@/components/admin/ActivityTracker'
import { ToastProvider } from '@/components/super-admin/Toast'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Administrateur | Scaniha',
  robots: { index: false, follow: false },
}

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  // requireSuperAdmin redirects owners → /admin and unauthenticated → /login.
  const { user } = await requireSuperAdmin()

  // Pending-payments + new-requests counts for the nav badges (fail-safe each).
  let pendingCount = 0
  let requestsCount = 0
  try {
    const admin = await createServiceRoleClient()
    const { count } = await (admin.from('payment_requests') as any).select('id', { count: 'exact', head: true }).eq('status', 'pending')
    pendingCount = count || 0
  } catch { pendingCount = 0 }
  try {
    const admin = await createServiceRoleClient()
    const { count } = await (admin.from('business_requests') as any).select('id', { count: 'exact', head: true }).eq('status', 'new')
    requestsCount = count || 0
  } catch { requestsCount = 0 }

  return (
    <ToastProvider>
      <SuperShell email={user?.email ?? null} pendingCount={pendingCount} requestsCount={requestsCount}>
        <ActivityTracker />
        {children}
      </SuperShell>
    </ToastProvider>
  )
}
