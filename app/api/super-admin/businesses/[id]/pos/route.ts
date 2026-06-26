import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/auth'
import { posConfig } from '@/lib/pos/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Super-admin control for a café's POS product (design_settings.pos).
 *   GET   → { enabled }
 *   PATCH → body { enabled? }
 * Enabling provisions the primary branch so the terminal works immediately.
 * Lets the platform operator turn the POS product on/off per café.
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
  return NextResponse.json({ enabled: posConfig(biz).enabled })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try { await requireSuperAdmin() } catch (e: any) { const r = guard(e); if (r) return r }

  const body = await req.json().catch(() => ({}))
  const sb: any = await createServiceRoleClient()
  const { data: biz } = await sb.from('businesses').select('name, design_settings').eq('id', id).maybeSingle()
  if (!biz) return NextResponse.json({ error: 'Café introuvable.' }, { status: 404 })

  const ds = biz.design_settings && typeof biz.design_settings === 'object' ? biz.design_settings : {}
  const pos = ds.pos && typeof ds.pos === 'object' ? ds.pos : {}
  const enabled = typeof body.enabled === 'boolean' ? body.enabled : Boolean(pos.enabled)

  const nextDs = { ...ds, pos: { ...pos, enabled } }
  const { error } = await sb.from('businesses').update({ design_settings: nextDs }).eq('id', id)
  if (error) { console.error('super-admin pos:', error.message); return NextResponse.json({ error: 'Échec de la mise à jour.' }, { status: 500 }) }

  // Provision the primary branch on first enable so the terminal works out of the box.
  if (enabled) { try { await sb.rpc('pos_ensure_primary_branch', { p_business: id, p_name: biz.name || 'Principal' }) } catch {} }

  return NextResponse.json({ ok: true, enabled })
}
