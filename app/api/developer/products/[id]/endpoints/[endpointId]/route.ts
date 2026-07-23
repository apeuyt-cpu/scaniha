/**
 * Developer Platform — Single Product Endpoint Management
 * PATCH  /api/developer/products/[id]/endpoints/[endpointId]  — update endpoint
 * DELETE /api/developer/products/[id]/endpoints/[endpointId]  — delete endpoint
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
  console.error('[DEV_PRODUCT_ENDPOINT_ERROR]', err)
  return NextResponse.json(
    { success: false, error: { code: 'SERVER_ERROR', message: err.message || 'Server error' } },
    { status: 500 }
  )
}

const UpdateProductEndpointSchema = CreateProductEndpointSchema.partial().omit({ product_id: true })

// PATCH /api/developer/products/[id]/endpoints/[endpointId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; endpointId: string }> }
) {
  try {
    await requireSuperAdmin()
    const { id: productId, endpointId } = await params
    const admin = await createServiceRoleClient()
    const body = await req.json()
    const input = UpdateProductEndpointSchema.parse(body)

    const { data, error } = await (admin.from('dev_product_endpoints') as any)
      .update(input)
      .eq('id', endpointId)
      .eq('product_id', productId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return handleApiError(err)
  }
}

// DELETE /api/developer/products/[id]/endpoints/[endpointId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; endpointId: string }> }
) {
  try {
    await requireSuperAdmin()
    const { id: productId, endpointId } = await params
    const admin = await createServiceRoleClient()

    const { error } = await (admin.from('dev_product_endpoints') as any)
      .delete()
      .eq('id', endpointId)
      .eq('product_id', productId)

    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true, message: 'Endpoint deleted' })
  } catch (err: any) {
    return handleApiError(err)
  }
}
