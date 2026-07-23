/**
 * Developer Platform — Client Keys API
 * GET /api/developer/clients/[id]/keys — list keys
 * POST /api/developer/clients/[id]/keys — create key
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { listClientApiKeys, createApiKey } from '@/lib/developer-platform/api-keys'
import { CreateApiKeySchema } from '@/lib/developer-platform/validation'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

function handleApiError(err: any) {
  if (err?.digest?.startsWith?.('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT' || err?.message === 'REDIRECT') {
    return NextResponse.json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Unauthorized: Super Admin session required. Please log in as super-admin.' }
    }, { status: 401 })
  }
  if (err instanceof z.ZodError) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input parameters', details: err.issues } }, { status: 400 })
  }
  console.error('[DEV_API_CLIENT_KEYS_ERROR]', err)
  return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: err.message || 'Server error' } }, { status: 500 })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin()
    const { id } = await params
    const keys = await listClientApiKeys(id)
    return NextResponse.json({ success: true, data: keys })
  } catch (err: any) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireSuperAdmin()
    const { id } = await params
    const body  = await req.json()
    const input = CreateApiKeySchema.parse({ ...body, client_id: id })
    const { key, rawKey } = await createApiKey(input, user.id)
    // Return raw key in this response ONLY — it will never be retrievable again
    return NextResponse.json({ success: true, data: { ...key, raw_key: rawKey } }, { status: 201 })
  } catch (err: any) {
    return handleApiError(err)
  }
}
