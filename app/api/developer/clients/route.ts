/**
 * Developer Platform — Super Admin API Routes: Clients
 * GET /api/developer/clients — list clients
 * POST /api/developer/clients — create client
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { listApiClients, createApiClient } from '@/lib/developer-platform/api-clients'
import { CreateApiClientSchema, PaginationSchema } from '@/lib/developer-platform/validation'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

function handleApiError(err: any) {
  // Translate NEXT_REDIRECT to 401 JSON response instead of redirecting fetch calls to HTML pages
  if (err?.digest?.startsWith?.('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT' || err?.message === 'REDIRECT') {
    return NextResponse.json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Unauthorized: Super Admin session required. Please log in as super-admin.' }
    }, { status: 401 })
  }
  if (err instanceof z.ZodError) {
    return NextResponse.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input parameters', details: err.issues }
    }, { status: 400 })
  }
  console.error('[DEV_API_CLIENTS_ERROR]', err)
  const errorMessage = err?.message || err?.hint || String(err)
  return NextResponse.json({
    success: false,
    error: { code: 'SERVER_ERROR', message: errorMessage, details: err?.details || null }
  }, { status: 500 })
}

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const url = new URL(req.url)

    const params = PaginationSchema.parse({
      page:     url.searchParams.get('page')     ?? 1,
      per_page: url.searchParams.get('per_page') ?? 20,
      search:   url.searchParams.get('search'),
      sort:     url.searchParams.get('sort'),
      order:    url.searchParams.get('order'),
    })

    const status = url.searchParams.get('status') ?? undefined
    const { clients, total } = await listApiClients({ ...params, status })

    return NextResponse.json({
      success: true,
      data: clients,
      meta: {
        page:     params.page,
        per_page: params.per_page,
        total,
        has_more: params.page * params.per_page < total,
      },
    })
  } catch (err: any) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireSuperAdmin()
    const body = await req.json()
    const input = CreateApiClientSchema.parse(body)
    const client = await createApiClient(input, user.id)

    return NextResponse.json({ success: true, data: client }, { status: 201 })
  } catch (err: any) {
    return handleApiError(err)
  }
}
