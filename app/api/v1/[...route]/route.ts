/**
 * Developer Platform — External API Gateway Router
 * /api/v1/*
 *
 * Handles live external developer API requests authenticated via dev_api_keys.
 * Authenticates API key, enforces sliding-window rate limits,
 * logs request analytics, and routes to the correct product handler.
 *
 * Every handler is scoped to client.business_id — no cross-business data leaks.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/developer-platform/api-keys'
import { checkRateLimits } from '@/lib/developer-platform/rate-limiter'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { dispatchWebhookEvent } from '@/lib/developer-platform/webhooks'

export const dynamic = 'force-dynamic'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(data: unknown, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status })
}

function err(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status })
}

// ─── Product Handlers ────────────────────────────────────────────────────────

/** GET /api/v1/menu — returns categories + items scoped to the client's business */
async function handleMenu(req: NextRequest, businessId: string) {
  const admin = await createServiceRoleClient()

  const { data: categories, error } = await (admin.from('categories') as any)
    .select('id, name, position, available, items(id, name, description, price, available, position)')
    .eq('business_id', businessId)
    .eq('available', true)
    .order('position', { ascending: true })

  if (error) throw new Error(error.message)

  // Sort items by position within each category
  const data = (categories ?? []).map((cat: any) => ({
    ...cat,
    items: (cat.items ?? [])
      .filter((it: any) => it.available)
      .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)),
  }))

  return ok(data)
}

/** GET /api/v1/loyalty — returns the loyalty program config for the client's business */
async function handleLoyalty(req: NextRequest, businessId: string, businessSlug: string) {
  const admin = await createServiceRoleClient()

  // Check loyalty program exists and is active
  const { data: program, error: progErr } = await (admin.from('loyalty_programs') as any)
    .select('id, points_per_tnd, active')
    .eq('business_id', businessId)
    .maybeSingle()

  if (progErr) throw new Error(progErr.message)
  if (!program) return err('not_found', 'No loyalty program found for this business.', 404)
  if (!program.active) return err('program_inactive', 'The loyalty program is currently inactive.', 409)

  // Get active rewards
  const { data: rewards } = await (admin.from('loyalty_rewards') as any)
    .select('id, label, points_cost, image_url')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('points_cost', { ascending: true })

  return ok({
    active: true,
    points_per_tnd: Number(program.points_per_tnd) || 1,
    rewards: rewards ?? [],
  })
}

/** GET /api/v1/orders — list orders; POST /api/v1/orders — create order */
async function handleOrders(req: NextRequest, businessId: string, method: string) {
  const admin = await createServiceRoleClient()

  if (method === 'POST') {
    const body = await req.json().catch(() => ({}))

    // Validate required fields
    const table = String(body.table ?? '').trim()
    if (!table) return err('validation_error', 'table is required.', 400)

    const items: { item_id: string; qty: number }[] = body.items ?? []
    if (!Array.isArray(items) || items.length === 0) {
      return err('validation_error', 'items must be a non-empty array.', 400)
    }

    // Verify all items belong to this business
    const itemIds = items.map(i => i.item_id).filter(Boolean)
    const { data: dbItems, error: itemErr } = await (admin.from('items') as any)
      .select('id, name, price, available, category_id, categories!inner(business_id)')
      .in('id', itemIds)

    if (itemErr) throw new Error(itemErr.message)

    const validItemIds = new Set(
      (dbItems ?? [])
        .filter((it: any) => it.available && it.categories?.business_id === businessId)
        .map((it: any) => it.id)
    )
    const invalidItems = itemIds.filter(id => !validItemIds.has(id))
    if (invalidItems.length > 0) {
      return err('validation_error', `Item(s) not found or unavailable: ${invalidItems.join(', ')}`, 400)
    }

    // Build order_items with server-side prices
    const itemMap = new Map<string, any>((dbItems ?? []).map((it: any) => [it.id, it]))
    const orderItems = items.map(i => {
      const dbItem = itemMap.get(i.item_id)
      return {
        item_id: i.item_id,
        name: dbItem?.name ?? '',
        price: Number(dbItem?.price ?? 0),
        qty: Math.max(1, Math.floor(Number(i.qty) || 1)),
      }
    })

    const total = orderItems.reduce((s, it) => s + it.price * it.qty, 0)

    // Place the order via RPC if available, otherwise direct insert
    const { data: order, error: orderErr } = await (admin.from('orders') as any)
      .insert({
        business_id: businessId,
        table_number: table,
        customer_name: body.customer_name ?? null,
        note: body.note ?? null,
        status: 'placed',
        total,
      })
      .select('id, table_number, status, total, created_at')
      .single()

    if (orderErr) throw new Error(orderErr.message)

    // Insert order items
    const orderItemRows = orderItems.map(it => ({
      order_id: order.id,
      name: it.name,
      price: it.price,
      qty: it.qty,
    }))
    await (admin.from('order_items') as any).insert(orderItemRows)

    // Fire webhook
    dispatchWebhookEvent(businessId, 'order.created', {
      order_id: order.id,
      table_number: table,
      total,
      status: 'placed',
    })

    return ok({ ...order, items: orderItemRows }, 201)
  }

  // GET — list recent orders
  const limit = 50
  const { data: orders, error: listErr } = await (admin.from('orders') as any)
    .select('id, table_number, status, customer_name, note, total, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (listErr) throw new Error(listErr.message)

  // Attach items
  const ids = (orders ?? []).map((o: any) => o.id)
  let itemsByOrder: Record<string, any[]> = {}
  if (ids.length > 0) {
    const { data: orderItems } = await (admin.from('order_items') as any)
      .select('order_id, name, price, qty')
      .in('order_id', ids)
    ;(orderItems ?? []).forEach((it: any) => {
      if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = []
      itemsByOrder[it.order_id].push(it)
    })
  }

  return ok(
    (orders ?? []).map((o: any) => ({ ...o, items: itemsByOrder[o.id] ?? [] }))
  )
}

/** GET /api/v1/customers — list customers; GET /api/v1/customers/[phone] */
async function handleCustomers(req: NextRequest, businessId: string, subPath: string[]) {
  const admin = await createServiceRoleClient()

  // /api/v1/customers/[phone] — single customer lookup
  if (subPath.length > 0 && subPath[0]) {
    const phone = decodeURIComponent(subPath[0]).replace(/[^\d+]/g, '')
    if (phone.length < 8 || phone.length > 15) {
      return err('validation_error', 'Invalid phone number.', 400)
    }

    const { data, error } = await (admin.rpc as any)('customer_summary', {
      p_business: businessId,
      p_phone: phone,
    })
    if (error) throw new Error(error.message)

    return ok({ phone, ...(data ?? { balance: 0, recent: [], activeWins: [], activeRedemptions: [] }) })
  }

  // /api/v1/customers — list unique customers with balance summary
  const { data: members, error: membErr } = await (admin.from('loyalty_members') as any)
    .select('phone, points_balance, created_at, last_transaction_at')
    .eq('business_id', businessId)
    .order('points_balance', { ascending: false })
    .limit(100)

  if (membErr) {
    // loyalty_members may not exist — fall back to loyalty_transactions
    const { data: txns } = await (admin.from('loyalty_transactions') as any)
      .select('phone, created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(200)

    const unique = new Map<string, string>()
    ;(txns ?? []).forEach((t: any) => {
      if (!unique.has(t.phone)) unique.set(t.phone, t.created_at)
    })

    return ok(
      Array.from(unique.entries()).map(([phone, last_seen]) => ({ phone, last_seen }))
    )
  }

  return ok(members ?? [])
}

/** GET /api/v1/analytics — real order + loyalty stats for the business */
async function handleAnalytics(req: NextRequest, businessId: string) {
  const admin = await createServiceRoleClient()
  const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const since7d  = new Date(Date.now() - 7  * 86_400_000).toISOString()
  const today    = new Date().toISOString().split('T')[0]

  const [
    { count: totalOrders30d },
    { count: totalOrdersToday },
    { data: revenueData },
    { count: totalCustomers },
    { count: totalRedemptions },
  ] = await Promise.all([
    (admin.from('orders') as any)
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .neq('status', 'rejected')
      .gte('created_at', since30d),
    (admin.from('orders') as any)
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .neq('status', 'rejected')
      .gte('created_at', today),
    (admin.from('orders') as any)
      .select('total')
      .eq('business_id', businessId)
      .neq('status', 'rejected')
      .gte('created_at', since30d),
    (admin.from('loyalty_members') as any)
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .throwOnError(),
    (admin.from('loyalty_redemptions') as any)
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('created_at', since30d),
  ].map(p => p.catch(() => ({ count: null, data: null }))))

  const revenue30d = (revenueData ?? []).reduce((s: number, o: any) => s + (Number(o.total) || 0), 0)

  return ok({
    period: '30_days',
    total_orders_30d: totalOrders30d ?? 0,
    total_orders_today: totalOrdersToday ?? 0,
    revenue_30d: Math.round(revenue30d * 100) / 100,
    total_customers: totalCustomers ?? 0,
    total_redemptions_30d: totalRedemptions ?? 0,
  })
}

/** GET /api/v1/games — real game/product config for the business */
async function handleGames(req: NextRequest, businessId: string) {
  const admin = await createServiceRoleClient()

  const { data: games, error } = await (admin.from('game_configs') as any)
    .select('id, type, name, active, created_at')
    .eq('business_id', businessId)

  if (error) {
    // game_configs table may use different name — try games
    const { data: alt } = await (admin.from('games') as any)
      .select('id, type, name, active, created_at')
      .eq('business_id', businessId)
      .catch(() => ({ data: null }))

    return ok({
      available_games: (alt ?? []).map((g: any) => g.type ?? g.name),
      games: alt ?? [],
    })
  }

  return ok({
    available_games: (games ?? []).filter((g: any) => g.active).map((g: any) => g.type ?? g.name),
    games: games ?? [],
  })
}

// ─── Main Gateway Handler ────────────────────────────────────────────────────

async function handleExternalApiRequest(req: NextRequest, params: { route: string[] }) {
  const startTime = Date.now()
  const routeSegments = params.route ?? []
  const path = '/api/v1/' + routeSegments.join('/')
  const method = req.method.toUpperCase()

  // 1. Extract Bearer token
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or malformed Authorization header. Use: Authorization: Bearer <your_api_key>',
      }
    }, { status: 401 })
  }

  const rawKey = authHeader.replace(/^Bearer\s+/, '').trim()

  // 2. Authenticate API Key
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || undefined
  const origin = req.headers.get('origin') || undefined

  const authResult = await authenticateApiKey(rawKey, { clientIp, origin })

  if (!authResult.valid || !authResult.client || !authResult.key) {
    return NextResponse.json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: authResult.error ?? 'Invalid or inactive API key' },
    }, { status: 401 })
  }

  const { client, key, businessId, businessSlug } = authResult

  // 3. Require linked business
  if (!businessId || !businessSlug) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'NO_BUSINESS_LINKED',
        message: 'This API client has no linked Scaniha business. Contact support or your super-admin.',
      },
    }, { status: 403 })
  }

  // 4. Enforce Rate Limits
  const rateLimitConfig = {
    per_minute: client.custom_rate_limit_per_minute ?? 100,
    per_day:    client.custom_rate_limit_per_day    ?? 10_000,
    per_month:  client.custom_rate_limit_per_month  ?? 250_000,
  }

  const rateLimitResult = await checkRateLimits(client.id, rateLimitConfig)

  if (!rateLimitResult.allowed) {
    return NextResponse.json({
      success: false,
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please slow down.' },
    }, { status: 429, headers: rateLimitResult.headers })
  }

  // 5. Route to handler
  let response: NextResponse

  try {
    const segment   = routeSegments[0] ?? ''
    const subPath   = routeSegments.slice(1)

    switch (segment) {
      case 'menu':
        response = await handleMenu(req, businessId)
        break

      case 'loyalty':
        response = await handleLoyalty(req, businessId, businessSlug)
        break

      case 'orders':
        response = await handleOrders(req, businessId, method)
        break

      case 'customers':
        response = await handleCustomers(req, businessId, subPath)
        break

      case 'analytics':
        response = await handleAnalytics(req, businessId)
        break

      case 'games':
        response = await handleGames(req, businessId)
        break

      default:
        response = NextResponse.json({
          success: true,
          message: 'Scaniha API v1 — authenticated',
          client: {
            company_name: client.company_name,
            environment: key.environment,
            business: businessSlug,
          },
          available_endpoints: [
            'GET  /api/v1/menu',
            'GET  /api/v1/loyalty',
            'GET  /api/v1/orders',
            'POST /api/v1/orders',
            'GET  /api/v1/customers',
            'GET  /api/v1/customers/:phone',
            'GET  /api/v1/analytics',
            'GET  /api/v1/games',
          ],
        })
    }
  } catch (e: any) {
    console.error('[API_V1_GATEWAY_ERROR]', e)
    response = NextResponse.json({
      success: false,
      error: { code: 'SERVER_ERROR', message: e?.message || 'Unexpected server error' },
    }, { status: 500 })
  }

  // 6. Attach rate-limit headers
  const statusCode = response.status
  rateLimitResult.headers && Object.entries(rateLimitResult.headers).forEach(([k, v]) => {
    response.headers.set(k, v)
  })
  response.headers.set('Scaniha-API-Version', '1')

  // 7. Log usage (fire-and-forget)
  logApiUsage(client.id, key.id, method, path, statusCode, Date.now() - startTime)

  return response
}

// ─── Usage Logger ────────────────────────────────────────────────────────────

async function logApiUsage(
  clientId: string,
  keyId: string,
  method: string,
  path: string,
  statusCode: number,
  durationMs: number
) {
  try {
    const admin = await createServiceRoleClient()
    const today = new Date().toISOString().split('T')[0]
    const isError = statusCode >= 400

    const { data: existing } = await (admin.from('dev_usage_daily') as any)
      .select('id, total_requests, success_requests, error_requests, avg_response_ms')
      .eq('client_id', clientId)
      .eq('day', today)
      .maybeSingle()

    if (existing) {
      const newTotal = (existing.total_requests ?? 0) + 1
      const newAvg = Math.round(
        ((existing.avg_response_ms ?? durationMs) * (newTotal - 1) + durationMs) / newTotal
      )
      await (admin.from('dev_usage_daily') as any).update({
        total_requests:   newTotal,
        success_requests: (existing.success_requests ?? 0) + (isError ? 0 : 1),
        error_requests:   (existing.error_requests   ?? 0) + (isError ? 1 : 0),
        avg_response_ms:  newAvg,
      }).eq('id', existing.id)
    } else {
      await (admin.from('dev_usage_daily') as any).insert({
        client_id:        clientId,
        api_key_id:       keyId,
        day:              today,
        total_requests:   1,
        success_requests: isError ? 0 : 1,
        error_requests:   isError ? 1 : 0,
        avg_response_ms:  durationMs,
      })
    }
  } catch {
    // Telemetry only — never crash the response
  }
}

// ─── Route Exports ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  return handleExternalApiRequest(req, await params)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  return handleExternalApiRequest(req, await params)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  return handleExternalApiRequest(req, await params)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  return handleExternalApiRequest(req, await params)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  return handleExternalApiRequest(req, await params)
}
