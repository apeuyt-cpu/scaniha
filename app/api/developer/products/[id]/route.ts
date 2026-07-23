/**
 * Developer Platform — Single Product Management
 * GET    /api/developer/products/[id]  — fetch a single product with endpoints
 * PATCH  /api/developer/products/[id]  — update product fields
 * DELETE /api/developer/products/[id]  — delete a product (and its endpoints)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { UpdateApiProductSchema } from '@/lib/developer-platform/validation'
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
  console.error('[DEV_PRODUCT_ERROR]', err)
  return NextResponse.json(
    { success: false, error: { code: 'SERVER_ERROR', message: err.message || 'Server error' } },
    { status: 500 }
  )
}

// GET /api/developer/products/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin()
    const { id } = await params
    const admin = await createServiceRoleClient()

    const { data, error } = await (admin.from('dev_api_products') as any)
      .select('*, dev_product_endpoints(*)')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } },
        { status: 404 }
      )
    }
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return handleApiError(err)
  }
}

// PATCH /api/developer/products/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin()
    const { id } = await params
    const admin = await createServiceRoleClient()
    const body = await req.json()
    const input = UpdateApiProductSchema.parse(body)

    const { data, error } = await (admin.from('dev_api_products') as any)
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return handleApiError(err)
  }
}

// DELETE /api/developer/products/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin()
    const { id } = await params
    const admin = await createServiceRoleClient()

    // Remove all endpoints first (foreign key)
    await (admin.from('dev_product_endpoints') as any).delete().eq('product_id', id)

    const { error } = await (admin.from('dev_api_products') as any).delete().eq('id', id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, message: 'Product deleted' })
  } catch (err: any) {
    return handleApiError(err)
  }
}
