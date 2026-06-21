import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { businessCacheTag } from '@/lib/db/business'

/**
 * Suspend or reactivate a business WITHOUT touching its expiry.
 *  - { status: 'paused' }  → suspend (the menu goes offline) but KEEP expires_at.
 *  - { status: 'active' }  → reactivate; remaining paid time is preserved.
 *
 * Pausing here never wipes paid days — that's the whole point of having a
 * dedicated suspend action separate from the duration controls.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin()

    const { id } = await params
    const { status } = await request.json()

    if (status !== 'active' && status !== 'paused') {
      return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    // Only update `status`; expires_at is intentionally left untouched.
    const updatePayload = { status: status as 'active' | 'paused' }
    const { data, error } = await (supabase
      .from('businesses') as any)
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Échec de la mise à jour du statut.' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    }

    // The public menu is cached by slug — bust it so pause/reactivate shows live.
    try {
      revalidateTag(businessCacheTag(data.slug), 'max')
    } catch {}

    return NextResponse.json({ data })
  } catch (error: any) {
    if (error?.digest?.startsWith?.('NEXT_REDIRECT') || error?.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }
}
