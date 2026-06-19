import { redirect } from 'next/navigation'
import { requireSuperAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** Default super-admin landing = Comptes (the accounts list). Aperçu moved to
 *  /super-admin/apercu. */
export default async function SuperAdminRoot() {
  await requireSuperAdmin()
  redirect('/super-admin/businesses')
}
