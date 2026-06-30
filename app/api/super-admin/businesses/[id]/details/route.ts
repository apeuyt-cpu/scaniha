import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { businessCacheTag } from '@/lib/db/business'

/**
 * Edit a business's own details (currently the display name).
 *
 * The name lives on the `businesses` table — separate from the owner's contact
 * profile (email/phone, see ./profile). Slug is intentionally NOT editable here:
 * it is the public URL baked into printed QR codes, so renaming it would break
 * every café's existing menu link.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin()

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const name = typeof body?.name === 'string' ? body.name.trim() : null

    if (!name) {
      return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 })
    }
    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Le nom est trop long (100 caractères maximum).' },
        { status: 400 }
      )
    }

    const supabase = await createServiceRoleClient()

    const { data, error } = await (supabase
      .from('businesses') as any)
      .update({ name })
      .eq('id', id)
      .select('id, name, slug')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Échec de la mise à jour du nom.' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    }

    // The public menu is cached by slug — bust it so the new name shows live.
    try {
      revalidateTag(businessCacheTag(data.slug), 'max')
    } catch {}

    return NextResponse.json({ data })
  } catch (error: any) {
    if (error?.digest?.startsWith?.('NEXT_REDIRECT') || error?.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }
    console.error('Update business details error:', error)
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }
}
