/**
 * Developer Platform — Key Revocation API
 * POST /api/developer/keys/[id]/revoke
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { revokeApiKey } from '@/lib/developer-platform/api-keys'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireSuperAdmin()
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    await revokeApiKey(id, user.id, body?.reason)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.digest?.startsWith?.('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT' || err?.message === 'REDIRECT') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized session.' } }, { status: 401 })
    }
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } }, { status: 500 })
  }
}
