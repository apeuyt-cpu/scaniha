import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { businessCacheTag } from '@/lib/db/business'

/**
 * Super-admin: change a business's menu design (theme_id) and/or accent colour
 * (primary_color). Both live on the `businesses` table. Validated against the
 * known design ids so a bad value can't break the public menu, then the public
 * menu cache (keyed by slug) is busted so the change shows live.
 */
const THEME_IDS = ['design1', 'design6', 'design11', 'design12', 'classic', 'minimal', 'dark']
const HEX = /^#[0-9a-fA-F]{6}$/

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin()

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const updates: Record<string, string> = {}

    if (typeof body?.theme_id === 'string') {
      if (!THEME_IDS.includes(body.theme_id)) {
        return NextResponse.json({ error: 'Design inconnu.' }, { status: 400 })
      }
      updates.theme_id = body.theme_id
    }
    if (typeof body?.primary_color === 'string') {
      if (!HEX.test(body.primary_color)) {
        return NextResponse.json({ error: 'Couleur invalide (format #RRGGBB).' }, { status: 400 })
      }
      updates.primary_color = body.primary_color
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucun changement de design.' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()
    const { data, error } = await (supabase
      .from('businesses') as any)
      .update(updates)
      .eq('id', id)
      .select('id, slug, theme_id, primary_color')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Échec de la mise à jour du design.' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    }

    // Public menu is cached by slug — bust it so the new design shows live.
    try {
      revalidateTag(businessCacheTag(data.slug), 'max')
    } catch {}

    return NextResponse.json({ data })
  } catch (error: any) {
    if (error?.digest?.startsWith?.('NEXT_REDIRECT') || error?.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }
    console.error('Update business design error:', error)
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }
}
