import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/auth'
import { orderingConfig } from '@/lib/design-settings'
import { newQrKey } from '@/lib/qr-session'
import { businessCacheTag } from '@/lib/db/business'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Super-admin control for a café's QR table-ordering (design_settings.ordering).
 *   GET   → { enabled, ttlMin, tables, hasKey }
 *   PATCH → body { enabled?, tables?, regen? }
 * Enabling mints a qrKey (the café must reprint table QRs). Mirrors /api/admin/ordering
 * but for the platform operator. Lets the super-admin provision ordering per café.
 */
function guard(e: any): NextResponse | null {
  if (e?.digest?.startsWith?.('NEXT_REDIRECT') || e?.message === 'NEXT_REDIRECT') throw e
  return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try { await requireSuperAdmin() } catch (e: any) { const r = guard(e); if (r) return r }
  const sb: any = await createServiceRoleClient()
  const { data: biz } = await sb.from('businesses').select('design_settings').eq('id', id).maybeSingle()
  if (!biz) return NextResponse.json({ error: 'Café introuvable.' }, { status: 404 })
  const o = orderingConfig(biz)
  return NextResponse.json({ enabled: o.enabled, ttlMin: o.ttlMin, tables: o.tables, hasKey: o.qrKey.length > 0 })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try { await requireSuperAdmin() } catch (e: any) { const r = guard(e); if (r) return r }

  const body = await req.json().catch(() => ({}))
  const sb: any = await createServiceRoleClient()
  const { data: biz } = await sb.from('businesses').select('slug, design_settings').eq('id', id).maybeSingle()
  if (!biz) return NextResponse.json({ error: 'Café introuvable.' }, { status: 404 })

  const ds = biz.design_settings && typeof biz.design_settings === 'object' ? biz.design_settings : {}
  const next = orderingConfig(biz) // {enabled, qrKey, ttlMin, tables}

  if (typeof body.enabled === 'boolean') next.enabled = body.enabled
  if (body.tables != null) {
    const t = Number(body.tables)
    if (Number.isFinite(t)) next.tables = Math.min(200, Math.max(0, Math.round(t)))
  }
  if (next.enabled && next.tables < 1) next.tables = 1
  if (body.regen === true || (next.enabled && !next.qrKey)) next.qrKey = newQrKey()

  const nextDs = { ...ds, ordering: next }
  const { error } = await sb.from('businesses').update({ design_settings: nextDs }).eq('id', id)
  if (error) { console.error('super-admin ordering:', error.message); return NextResponse.json({ error: 'Échec de la mise à jour.' }, { status: 500 }) }
  try { const { revalidateTag } = await import('next/cache'); revalidateTag(businessCacheTag(biz.slug), 'max') } catch {}

  return NextResponse.json({ ok: true, enabled: next.enabled, ttlMin: next.ttlMin, tables: next.tables, hasKey: next.qrKey.length > 0 })
}
