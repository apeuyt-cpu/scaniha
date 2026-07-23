/**
 * Developer Platform — Platform Stats API
 * GET /api/developer/stats
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { getPlatformStats } from '@/lib/developer-platform/api-clients'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    await requireSuperAdmin()
    const stats = await getPlatformStats()
    return NextResponse.json({ success: true, data: stats })
  } catch (err: any) {
    if (err?.digest?.startsWith?.('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT' || err?.message === 'REDIRECT') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized session.' } }, { status: 401 })
    }
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } }, { status: 500 })
  }
}
