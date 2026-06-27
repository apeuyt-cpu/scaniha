import { NextResponse } from 'next/server'
import { withStaff } from '@/lib/access/withStaff'
import { listStaffAudit } from '@/lib/db/staff'

export const dynamic = 'force-dynamic'

/** Staff activity feed ("qui a fait quoi"). Owner-level (staff.manage). */
export const GET = withStaff('staff.manage', async (_req, { business }) => {
  return NextResponse.json({ entries: await listStaffAudit(business.id, 80) })
})
