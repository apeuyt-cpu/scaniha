/**
 * Developer Platform — Plan Detail API
 * GET/PATCH/DELETE /api/developer/plans/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { getApiPlan, updateApiPlan, deleteApiPlan } from '@/lib/developer-platform/api-plans'
import { UpdateApiPlanSchema } from '@/lib/developer-platform/validation'
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
  console.error('[DEV_API_PLAN_DETAIL_ERROR]', err)
  return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: err.message || 'Server error' } }, { status: 500 })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin()
    const { id } = await params
    const plan = await getApiPlan(id)
    if (!plan) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Plan not found' } }, { status: 404 })
    return NextResponse.json({ success: true, data: plan })
  } catch (err: any) {
    return handleApiError(err)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireSuperAdmin()
    const { id } = await params
    const body = await req.json()
    const input = UpdateApiPlanSchema.parse(body)
    const plan = await updateApiPlan(id, input, user.id)
    return NextResponse.json({ success: true, data: plan })
  } catch (err: any) {
    return handleApiError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireSuperAdmin()
    const { id } = await params
    await deleteApiPlan(id, user.id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return handleApiError(err)
  }
}
