import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { requireOwner } from '@/lib/auth'
import { getActiveBusiness } from '@/lib/db/business'
import AdminShell from '@/components/admin/shell/AdminShell'
import StaffLockScreen from '@/components/admin/staff/StaffLockScreen'
import { isStaffPinEnabled } from '@/lib/access/permissions'
import { businessHasStaff, listStaffForLock } from '@/lib/db/staff'
import { verifyStaffSession, staffCookieName, STAFF_SESSION_TTL_MIN } from '@/lib/staff-session'
import { getActiveStaff } from '@/lib/access/staff-context'
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

  // Impersonating but the target no longer resolves (deleted café / stale cookie):
  // never fall through to the owner "create a business" form (that would let the
  // super-admin spawn a business owned by themselves). Send them back to the list.
  if (impersonating && !business) redirect('/super-admin/businesses')

  // Staff-PIN gate — opt-in (default off), fail-open (no staff = full owner
  // access), and bypassed for super-admin impersonation. Server-authoritative:
  // when locked, the lock screen REPLACES the app (children never render).
  if (business && !impersonating && isStaffPinEnabled(business)) {
    const hasStaff = await businessHasStaff(business.id)
    if (hasStaff) {
      const cookie = (await cookies()).get(staffCookieName(business.id))?.value
      const sid = verifyStaffSession(cookie, business.id, STAFF_SESSION_TTL_MIN)
      if (!sid) {
        const staff = await listStaffForLock(business.id)
        return <StaffLockScreen businessName={business.name} staff={staff} ownerBypass />
      }
    }
  }

  // Resolved staff capabilities → filter the nav (UX). null when PIN off/owner =
  // show everything. (Real enforcement is server-side per route.)
  const staff = business ? await getActiveStaff() : null
  const capabilities = staff && staff.role !== 'owner' ? staff.capabilities : null

  return (
    <AdminShell business={business} impersonating={impersonating} capabilities={capabilities}>
      {children}
    </AdminShell>
  )
}
