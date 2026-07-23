/**
 * Developer Platform — Product Endpoints API
 * GET  /api/developer/products/[id]/endpoints  — list all endpoints for a product
 * POST /api/developer/products/[id]/endpoints  — create a new endpoint for a product
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { CreateProductEndpointSchema } from '@/lib/developer-platform/validation'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

function handleApiError(err: any) {
  if (
    err?.digest?.startsWith?.('NEXT_REDIRECT') ||
    err?.message === 'NEXT_REDIRECT' ||
    err?.message === 'REDIRECT'
  ) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized session' } },
      { status: 401 }
    )
  }
  if (err instanceof z.ZodError) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.issues } },
      { status: 400 }
    )
  }
  console.error('[DEV_PRODUCT_ENDPOINTS_ERROR]', err)
  return NextResponse.json(
    { success: false, error: { code: 'SERVER_ERROR', message: err.message || 'Server error' } },
    { status: 500 }
  )
}

// GET /api/developer/products/[id]/endpoints
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin()
    const { id: productId } = await params
    const admin = await createServiceRoleClient()

    const { data, error } = await (admin.from('dev_product_endpoints') as any)
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (err: any) {
    return handleApiError(err)
  }
}

// POST /api/developer/products/[id]/endpoints
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin()
    const { id: productId } = await params
    const admin = await createServiceRoleClient()
    const body = await req.json()

    // Inject the product_id from the URL, allow override in body too
    const input = CreateProductEndpointSchema.parse({ ...body, product_id: productId })

    const { data, error } = await (admin.from('dev_product_endpoints') as any)
      .insert({
        product_id:     input.product_id,
        method:         input.method,
        path:           input.path,
        name:           input.name,
        description:    input.description ?? null,
        scope_required: input.scope_required ?? null,
        deprecated:     input.deprecated ?? false,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (err: any) {
    return handleApiError(err)
  }
}
