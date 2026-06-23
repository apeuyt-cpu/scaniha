import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireOwner } from '@/lib/auth'
import { getActiveBusiness, businessCacheTag } from '@/lib/db/business'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { orderingConfig } from '@/lib/design-settings'
import { newQrKey } from '@/lib/qr-session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Owner setup for table ordering (design_settings.ordering).
 *   GET                                   → { enabled, qrKey, ttlMin, tables }
 *   POST {enabled, tables?, ttlMin?}      → persists + returns the merged config.
 * requireOwner gates it; getActiveBusiness is the only business id ever used, so
 * an owner only ever touches their own café (super-admin "Gérer comme" → that one).
 *
 * The owner MAY see the qrKey — it is printed on the table QR anyway. Enabling
 * mints a qrKey if none exists yet (the per-table presence signature). We re-read
 * design_settings with the service-role client before merging so sibling keys are
 * never clobbered, then bust the public cache so isOrderingLive() flips live.
 */
export async function GET() {
  try {
    await requireOwner()
    const business = await getActiveBusiness()
    if (!business) return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    return NextResponse.json(orderingConfig(business))
  } catch (e: any) {
    if (e?.digest?.startsWith?.('NEXT_REDIRECT') || e?.message === 'NEXT_REDIRECT') throw e
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }
}

export async function POST(request: Request) {
  try {
    await requireOwner()
    const business = await getActiveBusiness()
    if (!business) return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const enabled = Boolean(body?.enabled)

    // Start from the CURRENTLY stored config so a partial POST keeps prior values.
    const current = orderingConfig(business)
    const tables = body?.tables === undefined
      ? current.tables
      : clamp(Number(body.tables), 1, 200, current.tables)
    const ttlMin = body?.ttlMin === undefined
      ? current.ttlMin
      : clamp(Number(body.ttlMin), 5, 1440, 120)

    // Re-read design_settings with the service-role client right before writing so
    // we merge over the freshest siblings (never clobber other keys).
    const svc: any = await createServiceRoleClient()
    const { data: fresh } = await svc
      .from('businesses')
      .select('design_settings')
      .eq('id', business.id)
      .maybeSingle()
    const ds = fresh?.design_settings && typeof fresh.design_settings === 'object' ? fresh.design_settings : {}
    const prev = ds.ordering && typeof ds.ordering === 'object' ? ds.ordering : {}

    // Generate the per-table presence key on first enable; keep it otherwise.
    const existingKey = typeof prev.qrKey === 'string' && prev.qrKey ? prev.qrKey : current.qrKey
    const qrKey = existingKey || (enabled ? newQrKey() : '')

    const ordering = { enabled, qrKey, ttlMin, tables }
    const nextDs = { ...ds, ordering }

    const { error } = await svc.from('businesses').update({ design_settings: nextDs }).eq('id', business.id)
    if (error) {
      console.error('[admin/ordering] update:', error.message)
      return NextResponse.json({ error: 'Échec de la mise à jour.' }, { status: 500 })
    }

    // Bust the public menu cache so isOrderingLive() takes effect immediately.
    try { revalidateTag(businessCacheTag(business.slug), 'max') } catch {}

    return NextResponse.json(ordering)
  } catch (e: any) {
    if (e?.digest?.startsWith?.('NEXT_REDIRECT') || e?.message === 'NEXT_REDIRECT') throw e
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }
}

/** Clamp `n` to [min, max], falling back to `fallback` when it isn't a finite number. */
function clamp(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}
