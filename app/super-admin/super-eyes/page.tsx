import { requireSuperAdmin } from '@/lib/auth'
import SuperEyes from '@/components/super-admin/SuperEyes'

export const dynamic = 'force-dynamic'

export default async function SuperEyesPage() {
  await requireSuperAdmin()
  return <SuperEyes />
}
