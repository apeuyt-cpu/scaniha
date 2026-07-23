/**
 * Developer Platform — Key Rotation API
 * POST /api/developer/keys/[id]/rotate
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { rotateApiKey } from '@/lib/developer-platform/api-keys'

export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireSuperAdmin()
    const { id } = await params
    const { key, rawKey } = await rotateApiKey(id, user.id)
    return NextResponse.json({ success: true, data: { ...key, raw_key: rawKey } })
  } catch (err: any) {
    if (err?.digest?.startsWith?.('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT' || err?.message === 'REDIRECT') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized session.' } }, { status: 401 })
    }
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } }, { status: 500 })
  }
}
