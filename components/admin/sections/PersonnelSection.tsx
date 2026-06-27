'use client'

import PageHeader from '@/components/admin/kit/PageHeader'
import StaffManager from '@/components/admin/staff/StaffManager'
import { IconUsers } from '@/components/admin/shell/icons'

/**
 * "Personnel & PIN" section — the unified staff identity + access home. One PIN
 * per employee used across admin + POS + fidélité (app_staff). Replaces the old
 * split between caisse-PIN and POS-staff managers.
 */
export default function PersonnelSection() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Personnel & PIN" subtitle="Les codes PIN et les accès de votre équipe." icon={<IconUsers width={20} height={20} />} />
      <StaffManager />
    </div>
  )
}
