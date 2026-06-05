import { requireSuperAdmin } from '@/lib/auth'
import SuperAdminNav from '@/components/super-admin/SuperAdminNav'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Admin | Scaniha',
  robots: { index: false, follow: false },
}

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // requireSuperAdmin will redirect if user is not super_admin
  // It automatically blocks owners and redirects them to /admin
  // This happens before any rendering, so no sensitive data is exposed
  await requireSuperAdmin()

  // Only render if user is confirmed super_admin
  return (
    <div className="min-h-screen bg-zinc-100">
      <SuperAdminNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
