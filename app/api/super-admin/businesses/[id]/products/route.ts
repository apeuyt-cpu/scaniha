import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/auth'
import { businessCacheTag } from '@/lib/db/business'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Super-admin control for a café's product mode (design_settings.products):
 * 'menu' | 'fidelity' | 'both' — or null to fall back to legacy behaviour
 * (menu + fidelity when the owner's loyaltyEnabled is on).
 *
 *   GET   → { products: 'menu'|'fidelity'|'both'|null }
 *   PATCH → body { products: 'menu'|'fidelity'|'both'|null }
 *
 * Busts the public menu cache so resolveMode() takes effect immediately.
 */
const VALID = ['menu', 'fidelity', 'both'] as const

function guard(e: any): NextResponse | null {
  if (e?.digest?.startsWith?.('NEXT_REDIRECT') || e?.message === 'NEXT_REDIRECT') throw e
  return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try { await requireSuperAdmin() } catch (e: any) { const r = guard(e); if (r) return r }
  const supabase: any = await createServiceRoleClient()
  const { data } = await supabase.from('businesses').select('design_settings').eq('id', id).maybeSingle()
  const p = data?.design_settings?.products
  return NextResponse.json({ products: (VALID as readonly string[]).includes(p) ? p : null })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try { await requireSuperAdmin() } catch (e: any) { const r = guard(e); if (r) return r }

  const body = await req.json().catch(() => ({}))
  const products = body.products
  if (products !== null && !(VALID as readonly string[]).includes(products)) {
    return NextResponse.json({ error: 'Produit invalide.' }, { status: 400 })
  }

  const supabase: any = await createServiceRoleClient()
  const { data: biz } = await supabase.from('businesses').select('slug, design_settings').eq('id', id).maybeSingle()
  if (!biz) return NextResponse.json({ error: 'Café introuvable.' }, { status: 404 })

  // Merge so we never clobber other design_settings keys.
  const ds = biz.design_settings && typeof biz.design_settings === 'object' ? biz.design_settings : {}
  const nextDs = { ...ds }
  if (products === null) delete nextDs.products
  else nextDs.products = products

  const { error } = await supabase.from('businesses').update({ design_settings: nextDs }).eq('id', id)
  if (error) {
    console.error('super-admin products:', error.message)
    return NextResponse.json({ error: 'Échec de la mise à jour.' }, { status: 500 })
  }

  try { revalidateTag(businessCacheTag(biz.slug), 'max') } catch {}
  return NextResponse.json({ ok: true, products: products ?? null })
}
