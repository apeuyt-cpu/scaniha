import { redirect } from 'next/navigation'
import { requireSuperAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** Default super-admin landing = the overview dashboard. */
export default async function SuperAdminRoot() {
  await requireSuperAdmin()
  redirect('/super-admin/apercu')
}
