import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient, createServerClient } from '@/lib/supabase/server'
import { businessCacheTag } from '@/lib/db/business'

/**
 * Update a business's subscription expiry — NEVER destroys paid time.
 *
 * Body (one of):
 *  - { mode: 'extend', minutes: N }   → add N minutes to the LATER of (now, current expires_at)
 *  - { mode: 'set', expiresAt: ISO }  → set an exact expiry date (must be in the future)
 *  - { mode: 'unlimited' }            → remove expiry (lifetime / no expiry)
 *
 * Backward compatible: a bare { minutes } / { days } payload is treated as 'extend'.
 * Pausing/suspending is NOT handled here — use the /status endpoint for that.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin()

    const { id } = await params
    const body = await request.json()
    let { mode, minutes, days, expiresAt } = body

    // Get supabase client.
    let supabase
    try {
      supabase = await createServiceRoleClient()
    } catch {
      supabase = await createServerClient()
    }

    // Infer mode for legacy / bare payloads.
    if (!mode) {
      if (expiresAt !== undefined) mode = 'set'
      else if ((minutes === null) || (days === null)) mode = 'unlimited'
      else mode = 'extend'
    }

    let expires_at: string | null = null

    if (mode === 'unlimited') {
      expires_at = null
    } else if (mode === 'set') {
      const target = new Date(expiresAt)
      if (isNaN(target.getTime())) {
        return NextResponse.json({ error: 'Date d’expiration invalide.' }, { status: 400 })
      }
      if (target.getTime() <= Date.now()) {
        return NextResponse.json(
          { error: 'La date d’expiration doit être dans le futur.' },
          { status: 400 }
        )
      }
      expires_at = target.toISOString()
    } else if (mode === 'extend') {
      // Resolve how many minutes to add.
      let addMinutes: number | null = null
      if (minutes !== undefined && minutes !== null) {
        addMinutes = Number(minutes)
      } else if (days !== undefined && days !== null) {
        addMinutes = Number(days) * 24 * 60
      }
      if (addMinutes === null || !Number.isFinite(addMinutes) || addMinutes <= 0) {
        return NextResponse.json(
          { error: 'Veuillez saisir une durée valide à ajouter.' },
          { status: 400 }
        )
      }

      // Read the current expiry so we EXTEND from the later of (now, current expiry)
      // — never discard remaining paid time.
      const { data: biz, error: readErr } = await (supabase.from('businesses') as any)
        .select('expires_at')
        .eq('id', id)
        .single()

      if (readErr || !biz) {
        return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
      }

      const now = new Date()
      const from =
        biz.expires_at && new Date(biz.expires_at) > now ? new Date(biz.expires_at) : now
      from.setMinutes(from.getMinutes() + addMinutes)
      expires_at = from.toISOString()
    } else {
      return NextResponse.json({ error: 'Action invalide.' }, { status: 400 })
    }

    // Setting/extending time always (re)activates the business — it has paid time.
    const { data, error } = await (supabase
      .from('businesses') as any)
      .update({ expires_at, status: 'active' })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('time route DB error:', error)
      return NextResponse.json(
        { error: 'Échec de la mise à jour de la durée.' },
        { status: 500 }
      )
    }

    // The public menu is cached by slug — bust it so extend/expiry shows live.
    try {
      revalidateTag(businessCacheTag(data.slug), 'max')
    } catch {}

    return NextResponse.json({ data })
  } catch (error: any) {
    if (error?.digest?.startsWith?.('NEXT_REDIRECT') || error?.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }
    console.error('time route error:', error)
    const unauthorized = error.message?.includes('Unauthorized') || error.message?.includes('auth')
    return NextResponse.json(
      { error: unauthorized ? 'Non autorisé.' : 'Erreur serveur.' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}
