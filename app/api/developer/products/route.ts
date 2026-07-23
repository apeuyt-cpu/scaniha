/**
 * Developer Platform — Super Admin API Routes: Products & Endpoints
 * GET/POST /api/developer/products
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { CreateApiProductSchema } from '@/lib/developer-platform/validation'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

function handleApiError(err: any) {
  if (err?.digest?.startsWith?.('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT' || err?.message === 'REDIRECT') {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized session' } }, { status: 401 })
  }
  if (err instanceof z.ZodError) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.issues } }, { status: 400 })
  }
  return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } }, { status: 500 })
}

export async function GET(_req: NextRequest) {
  try {
    await requireSuperAdmin()
    const admin = await createServiceRoleClient()
    const { data } = await (admin.from('dev_api_products') as any)
      .select('*, dev_product_endpoints(*)')
      .order('created_at', { ascending: true })
    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (err: any) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const admin = await createServiceRoleClient()
    const body = await req.json()
    const input = CreateApiProductSchema.parse(body)

    const { data, error } = await (admin.from('dev_api_products') as any)
      .insert(input)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (err: any) {
    return handleApiError(err)
  }
}
