import { requireOwner } from '@/lib/auth'
import { getActiveBusiness } from '@/lib/db/business'
import AdminLayoutClient from '@/components/admin/AdminLayoutClient'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  try {
    await requireOwner()
    const business = await getActiveBusiness()
    
    if (business?.logo_url) {
      return {
        title: `${business.name} — Tableau de bord`,
        robots: { index: false, follow: false },
        icons: {
          icon: business.logo_url,
          apple: business.logo_url,
        },
      }
    }

    return {
      title: 'Tableau de bord',
      robots: { index: false, follow: false },
      icons: {
        icon: '/logo.png',
        apple: '/logo.png',
      },
    }
  } catch (error: any) {
    // Don't catch redirect errors - let them propagate
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    return {
      title: 'Tableau de bord',
      robots: { index: false, follow: false },
      icons: {
        icon: '/logo.png',
        apple: '/logo.png',
      },
    }
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // requireOwner will redirect if user is not authenticated or doesn't have owner role
  // It automatically redirects super_admin users to /super-admin
  const { profile } = await requireOwner()

  // Owner → their own business; super_admin "Gérer comme l'établissement" → the
  // impersonated one. getActiveBusiness is the authorization boundary.
  const business = await getActiveBusiness()
  const impersonating = profile.role === 'super_admin'

  return (
    <AdminLayoutClient business={business} impersonating={impersonating}>
      {children}
    </AdminLayoutClient>
  )
}
