import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { withStaff } from '@/lib/access/withStaff'
import { businessCacheTag } from '@/lib/db/business'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Server-authoritative writes to the businesses row for the owner-admin
 * "design / branding / settings" surface. These used to be written DIRECTLY
 * from the browser via the anon client (RLS owner_id = auth.uid()). The problem:
 * a staff member without `design.manage` / `settings.manage` still acts under the
 * owner's auth session, so RLS lets them write — RLS cannot read the staff HMAC
 * cookie. Moving the WRITES here lets `withStaff(capability, …)` enforce the cap
 * per action; behaviour is unchanged for cafés with no staff PIN (owner-level).
 *
 * POST { action, … } switch (legacy `{ error }` envelope):
 *   - mergeSettings  (design.manage)  { patch: object }   → shallow-merge over the
 *       freshest design_settings (service role) so concurrent edits never clobber
 *       sibling keys. Covers ContactCard, SeoSettings, SocialMediaManager (legacy
 *       slice), PartageSection, FidelityToggle and DesignSettings' design_settings.
 *   - setPrimaryColor (design.manage) { color: string|null }  → businesses.primary_color
 *   - setTheme        (design.manage) { themeId: string }     → businesses.theme_id
 *   - setSocialLinks  (design.manage) { links: {…} }          → flat social columns
 *   - setName         (settings.manage){ name: string }       → businesses.name
 *
 * Always operates on `business.id` from the session — never a client-sent id.
 */

/** Shallow plain-object check (rejects arrays, null, functions, class instances). */
function isPlainObject(v: any): boolean {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v)
}

/** Re-read design_settings with the service role right before merging. */
async function freshSettings(svc: any, id: string): Promise<Record<string, any>> {
  const { data } = await svc.from('businesses').select('design_settings').eq('id', id).maybeSingle()
  return data?.design_settings && typeof data.design_settings === 'object' ? data.design_settings : {}
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

// Social columns the owner can edit (allow-list — never accept arbitrary columns).
const SOCIAL_KEYS = ['facebook_url', 'instagram_url', 'twitter_url', 'whatsapp_number', 'website_url', 'google_url']

export const POST = async (req: Request, ctx?: { params?: any }) => {
  const body = await req.json().catch(() => ({}))
  const action = typeof body?.action === 'string' ? body.action : ''

  // Pick the capability per action; settings.manage only for the café rename.
  const cap = action === 'setName' ? 'settings.manage' : 'design.manage'

  const handler = withStaff(cap as any, async (_r, { business }) => {
    const svc: any = await createServiceRoleClient()

    if (action === 'mergeSettings') {
      const patch = body?.patch
      if (!isPlainObject(patch)) {
        return NextResponse.json({ error: 'Données invalides.' }, { status: 400 })
      }
      // Cap the JSON size so a runaway payload can't bloat the row.
      if (JSON.stringify(patch).length > 20000) {
        return NextResponse.json({ error: 'Données trop volumineuses.' }, { status: 413 })
      }
      const ds = await freshSettings(svc, business.id)
      const design_settings = { ...ds, ...patch }
      const { error } = await svc.from('businesses').update({ design_settings }).eq('id', business.id)
      if (error) {
        console.error('[admin/design] mergeSettings:', error.message)
        return NextResponse.json({ error: 'Échec de la mise à jour.' }, { status: 500 })
      }
      try { revalidateTag(businessCacheTag(business.slug), 'max') } catch {}
      return NextResponse.json({ ok: true, design_settings })
    }

    if (action === 'setPrimaryColor') {
      const raw = body?.color
      let color: string | null = null
      if (raw === null || raw === undefined || raw === '') {
        color = null
      } else if (typeof raw === 'string' && HEX.test(raw.trim())) {
        color = raw.trim()
      } else {
        return NextResponse.json({ error: 'Couleur invalide.' }, { status: 400 })
      }
      const { error } = await svc.from('businesses').update({ primary_color: color }).eq('id', business.id)
      if (error) {
        console.error('[admin/design] setPrimaryColor:', error.message)
        return NextResponse.json({ error: 'Échec de la mise à jour.' }, { status: 500 })
      }
      try { revalidateTag(businessCacheTag(business.slug), 'max') } catch {}
      return NextResponse.json({ ok: true, primary_color: color })
    }

    if (action === 'setTheme') {
      const themeId = typeof body?.themeId === 'string' ? body.themeId.trim() : ''
      if (!themeId || themeId.length > 40) {
        return NextResponse.json({ error: 'Thème invalide.' }, { status: 400 })
      }
      const { error } = await svc.from('businesses').update({ theme_id: themeId }).eq('id', business.id)
      if (error) {
        console.error('[admin/design] setTheme:', error.message)
        return NextResponse.json({ error: 'Échec de la mise à jour.' }, { status: 500 })
      }
      try { revalidateTag(businessCacheTag(business.slug), 'max') } catch {}
      return NextResponse.json({ ok: true, theme_id: themeId })
    }

    if (action === 'setSocialLinks') {
      const links = body?.links
      if (!isPlainObject(links)) {
        return NextResponse.json({ error: 'Données invalides.' }, { status: 400 })
      }
      const patch: Record<string, string | null> = {}
      for (let i = 0; i < SOCIAL_KEYS.length; i++) {
        const k = SOCIAL_KEYS[i]
        const v = (links as any)[k]
        patch[k] = typeof v === 'string' && v.trim() ? v.trim().slice(0, 500) : null
      }
      const { error } = await svc.from('businesses').update(patch).eq('id', business.id)
      if (error) {
        console.error('[admin/design] setSocialLinks:', error.message)
        return NextResponse.json({ error: 'Échec de la mise à jour.' }, { status: 500 })
      }
      try { revalidateTag(businessCacheTag(business.slug), 'max') } catch {}
      return NextResponse.json({ ok: true })
    }

    if (action === 'setName') {
      const name = typeof body?.name === 'string' ? body.name.trim() : ''
      if (!name) {
        return NextResponse.json({ error: "Le nom de l'établissement ne peut pas être vide." }, { status: 400 })
      }
      if (name.length > 120) {
        return NextResponse.json({ error: 'Nom trop long.' }, { status: 400 })
      }
      const { error } = await svc.from('businesses').update({ name }).eq('id', business.id)
      if (error) {
        console.error('[admin/design] setName:', error.message)
        return NextResponse.json({ error: 'Échec de la mise à jour.' }, { status: 500 })
      }
      try { revalidateTag(businessCacheTag(business.slug), 'max') } catch {}
      return NextResponse.json({ ok: true, name })
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  })

  return handler(req, ctx)
}
