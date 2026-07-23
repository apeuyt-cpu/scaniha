/**
 * Developer Platform — Super Admin API Routes: Client Detail
 * GET/PATCH/DELETE /api/developer/clients/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { getApiClient, updateApiClient, suspendApiClient, reactivateApiClient } from '@/lib/developer-platform/api-clients'
import { UpdateApiClientSchema, SuspendClientSchema } from '@/lib/developer-platform/validation'
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
  console.error('[DEV_API_CLIENT_DETAIL_ERROR]', err)
  return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: err.message || 'Server error' } }, { status: 500 })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin()
    const { id } = await params
    const client = await getApiClient(id)
    if (!client) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Client not found' } }, { status: 404 })
    return NextResponse.json({ success: true, data: client })
  } catch (err: any) {
    return handleApiError(err)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireSuperAdmin()
    const { id } = await params
    const body = await req.json()

    // Handle special actions
    if (body._action === 'suspend') {
      const { reason } = SuspendClientSchema.parse(body)
      await suspendApiClient(id, reason, user.id)
      return NextResponse.json({ success: true })
    }
    if (body._action === 'reactivate') {
      await reactivateApiClient(id, user.id)
      return NextResponse.json({ success: true })
    }

    const input = UpdateApiClientSchema.parse(body)
    const client = await updateApiClient(id, input, user.id)
    return NextResponse.json({ success: true, data: client })
  } catch (err: any) {
    return handleApiError(err)
  }
}
