/**
 * Developer Platform — Super Admin API Routes: Plans
 * GET /api/developer/plans — list plans
 * POST /api/developer/plans — create plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { listApiPlans, createApiPlan } from '@/lib/developer-platform/api-plans'
import { CreateApiPlanSchema } from '@/lib/developer-platform/validation'
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
  console.error('[DEV_API_PLANS_ERROR]', err)
  return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: err.message || 'Server error' } }, { status: 500 })
}

export async function GET(_req: NextRequest) {
  try {
    await requireSuperAdmin()
    const plans = await listApiPlans(true)
    return NextResponse.json({ success: true, data: plans })
  } catch (err: any) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireSuperAdmin()
    const body  = await req.json()
    const input = CreateApiPlanSchema.parse(body)
    const plan  = await createApiPlan(input, user.id)
    return NextResponse.json({ success: true, data: plan }, { status: 201 })
  } catch (err: any) {
    return handleApiError(err)
  }
}
