import { requireOwner } from '@/lib/auth'
import { getBusinessByOwner } from '@/lib/db/business'
import AdminLayoutClient from '@/components/admin/AdminLayoutClient'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const { user } = await requireOwner()
    const business = await getBusinessByOwner(user.id)
    
    if (business?.logo_url) {
      return {
        title: `${business.name} - لوحة التحكم`,
        icons: {
          icon: business.logo_url,
          apple: business.logo_url,
        },
      }
    }
    
    return {
      title: 'لوحة التحكم',
      icons: {
        icon: '/logo-icon.png',
        apple: '/logo-icon.png',
      },
    }
  } catch {
    return {
      title: 'لوحة التحكم',
      icons: {
        icon: '/logo-icon.png',
        apple: '/logo-icon.png',
      },
    }
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let business = null
  try {
    const { user } = await requireOwner()
    business = await getBusinessByOwner(user.id)
  } catch (error) {
    // Error handled in AdminLayoutClient
  }

  return (
    <AdminLayoutClient business={business}>
      {children}
    </AdminLayoutClient>
  )
}
