import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { pauseExpiredBusinesses } from '@/lib/db/business'

/**
 * Maintenance endpoint: pause every active business whose subscription has
 * expired. This is the dedicated home for the status mutation that used to run
 * (incorrectly) as a side effect of loading the accounts list. Trigger it
 * manually from the operator panel or wire it to a scheduled cron job.
 */
export async function POST() {
  try {
    await requireSuperAdmin()
    const paused = await pauseExpiredBusinesses()
    return NextResponse.json({ success: true, paused })
  } catch (error: any) {
    if (error?.digest?.startsWith?.('NEXT_REDIRECT') || error?.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
