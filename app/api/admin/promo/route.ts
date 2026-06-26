import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { withStaff } from '@/lib/access/withStaff'
import { businessCacheTag } from '@/lib/db/business'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { promoConfig } from '@/lib/design-settings'
import { TN_OFFSET } from '@/lib/tz'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Owner promo banner (design_settings.promo). Guarded: GET page.promotions,
 * POST promos.manage. Merges over the freshest design_settings (service role)
 * then busts the public menu cache so the banner appears/updates.
 */
export const GET = withStaff('page.promotions', async (_req, { business }) => {
  return NextResponse.json(promoConfig(business))
})

export const POST = withStaff('promos.manage', async (request, { business }) => {
  const body = await request.json().catch(() => ({}))
  const enabled = Boolean(body?.enabled)
  const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 140) : ''
  const emoji = typeof body?.emoji === 'string' ? body.emoji.trim().slice(0, 8) : ''
  // Accept a YYYY-MM-DD or ISO string; store ISO. A bare date = end-of-day in
  // Tunisia (UTC+1) so the banner expires on the owner's local calendar day.
  let until: string | null = null
  if (typeof body?.until === 'string' && body.until.trim()) {
    const d = new Date(body.until.length <= 10 ? body.until + 'T23:59:59' + TN_OFFSET : body.until)
    if (!isNaN(d.getTime())) until = d.toISOString()
  }

  if (enabled && !message) {
    return NextResponse.json({ error: 'Saisissez le texte de l’annonce.' }, { status: 400 })
  }

  const svc: any = await createServiceRoleClient()
  const { data: fresh } = await svc.from('businesses').select('design_settings').eq('id', business.id).maybeSingle()
  const ds = fresh?.design_settings && typeof fresh.design_settings === 'object' ? fresh.design_settings : {}
  const promo = { enabled, message, emoji, until }

  const { error } = await svc.from('businesses').update({ design_settings: { ...ds, promo } }).eq('id', business.id)
  if (error) {
    console.error('[admin/promo] update:', error.message)
    return NextResponse.json({ error: 'Échec de la mise à jour.' }, { status: 500 })
  }
  try { revalidateTag(businessCacheTag(business.slug), 'max') } catch {}
  return NextResponse.json(promo)
})
