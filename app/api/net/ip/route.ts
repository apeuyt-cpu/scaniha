import { NextRequest, NextResponse } from 'next/server'
import { getClientIp } from '@/lib/presence'

/**
 * Echoes the caller's public IP. The café owner uses this in the admin
 * "presence lock" setup to capture their current network with one tap.
 * Harmless to expose (a caller can only ever see their own IP).
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return NextResponse.json({ ip: getClientIp(req) })
}
