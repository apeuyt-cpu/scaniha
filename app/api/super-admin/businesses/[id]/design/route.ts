import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { businessCacheTag } from '@/lib/db/business'
import { isDesignId } from '@/lib/design-settings'

/**
 * Super-admin: change a business's menu design (theme_id), accent colour
 * (primary_color) and/or logo (logo_url). All live on the `businesses` table.
 * Theme/colour are validated against the known ids/format so a bad value can't
 * break the public menu; logo_url is a Supabase-storage URL we just uploaded
 * (or null to remove). The public menu cache (keyed by slug) is then busted so
 * the change shows live.
 */
const THEME_IDS = ['design1', 'design6', 'design11', 'design12', 'classic', 'minimal', 'dark']
const HEX = /^#[0-9a-fA-F]{6}$/
const STORAGE_URL = /\/storage\/v1\/object\/public\//

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin()

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const updates: Record<string, any> = {}

    if (typeof body?.theme_id === 'string') {
      if (!THEME_IDS.includes(body.theme_id)) {
        return NextResponse.json({ error: 'Design inconnu.' }, { status: 400 })
      }
      updates.theme_id = body.theme_id
    }
    // Accept `color` (preferred) or legacy `primary_color`.
    const colorRaw = typeof body?.color === 'string' ? body.color
      : typeof body?.primary_color === 'string' ? body.primary_color : null
    if (colorRaw !== null) {
      if (!HEX.test(colorRaw)) {
        return NextResponse.json({ error: 'Couleur invalide (format #RRGGBB).' }, { status: 400 })
      }
      updates.primary_color = colorRaw
    }
    // logo_url: null clears it; a string must be a Supabase-storage URL (one we
    // just optimised + uploaded), never an arbitrary external link.
    if (body?.logo_url === null) {
      updates.logo_url = null
    } else if (typeof body?.logo_url === 'string') {
      if (!STORAGE_URL.test(body.logo_url)) {
        return NextResponse.json({ error: 'Logo invalide.' }, { status: 400 })
      }
      updates.logo_url = body.logo_url
    }

    // Advanced appearance (gradient / showcase / tagline) + the flat accent all
    // live in design_settings[designId]. Whitelist every key so a bad value can't
    // corrupt the JSON the public menu parses.
    const sIn = body?.settings && typeof body.settings === 'object' ? body.settings : null
    const dsPatch: Record<string, any> = {}
    if (colorRaw !== null) dsPatch.accent = colorRaw
    if (sIn) {
      if (typeof sIn.gradientEnabled === 'boolean') dsPatch.gradientEnabled = sIn.gradientEnabled
      if (typeof sIn.gradientFrom === 'string' && HEX.test(sIn.gradientFrom)) dsPatch.gradientFrom = sIn.gradientFrom
      if (typeof sIn.gradientTo === 'string' && HEX.test(sIn.gradientTo)) dsPatch.gradientTo = sIn.gradientTo
      if (typeof sIn.gradientAngle === 'number' && Number.isFinite(sIn.gradientAngle)) dsPatch.gradientAngle = Math.max(0, Math.min(360, Math.round(sIn.gradientAngle)))
      if (typeof sIn.showcase === 'boolean') dsPatch.showcase = sIn.showcase
      if (typeof sIn.tagline === 'string') dsPatch.tagline = sIn.tagline.slice(0, 200)
    }

    if (Object.keys(updates).length === 0 && Object.keys(dsPatch).length === 0) {
      return NextResponse.json({ error: 'Aucun changement de design.' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    // Merge the accent + advanced options into the ACTIVE design's settings —
    // modern designs (design1/6/11/12) read design_settings[designId], NOT
    // primary_color, so this is where the change actually takes effect. Classic
    // themes ignore it and keep using primary_color.
    if (Object.keys(dsPatch).length > 0) {
      const { data: cur } = await (supabase.from('businesses') as any)
        .select('theme_id, design_settings')
        .eq('id', id)
        .single()
      const theme = (typeof updates.theme_id === 'string' ? updates.theme_id : null) || cur?.theme_id || 'design1'
      if (isDesignId(theme)) {
        const ds = cur?.design_settings && typeof cur.design_settings === 'object' ? cur.design_settings : {}
        updates.design_settings = { ...ds, [theme]: { ...(ds[theme] || {}), ...dsPatch } }
      }
    }

    const { data, error } = await (supabase
      .from('businesses') as any)
      .update(updates)
      .eq('id', id)
      .select('id, slug, theme_id, primary_color, design_settings, logo_url')
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
