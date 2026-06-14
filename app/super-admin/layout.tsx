import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import SuperAdminShell from '@/components/super-admin/SuperAdminShell'
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

  // Pending-payments count for the Paiements tab badge (fail-safe).
  let pendingCount = 0
  try {
    const admin = await createServiceRoleClient()
    const { count } = await (admin.from('payment_requests') as any)
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    pendingCount = count || 0
  } catch {
    pendingCount = 0
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-zinc-50" dir="ltr">
        <SuperAdminShell email={user?.email ?? null} pendingCount={pendingCount} />
        <main className="mx-auto max-w-5xl p-5 lg:p-8">{children}</main>
      </div>
    </ToastProvider>
  )
}
