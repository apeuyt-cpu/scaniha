import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { businessCacheTag } from '@/lib/db/business'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireSuperAdmin()

    const { id } = await params

    // Require the operator to type the exact business name to confirm.
    // This is an irreversible cascade delete (categories, items, subscriptions,
    // images) — the typed confirmation is the guard against accidental loss.
    let confirmName: string | null = null
    try {
      const body = await request.json()
      confirmName = typeof body?.confirmName === 'string' ? body.confirmName : null
    } catch {
      confirmName = null
    }

    const supabase = await createServiceRoleClient()

    // Fetch the business to verify it exists and to validate the typed name.
    const { data: business, error: fetchError } = await (supabase
      .from('businesses') as any)
      .select('id, name, slug, logo_url, owner_id')
      .eq('id', id)
      .single()

    if (fetchError || !business) {
      return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    }

    if (!confirmName || confirmName.trim() !== business.name) {
      return NextResponse.json(
        { error: 'Le nom saisi ne correspond pas. Suppression annulée.' },
        { status: 400 }
      )
    }

    // Audit trail (no soft-delete/audit table exists — log to server console).
    console.warn(
      `[AUDIT] super-admin ${user.id} (${user.email ?? 'n/a'}) is DELETING business ` +
        `${business.id} ("${business.name}") at ${new Date().toISOString()}`
    )

    // Clean up stored images (Supabase Storage) if they exist.
    try {
      const { deleteStoredImage } = await import('@/lib/storage-server')

      if (business.logo_url) {
        try { await deleteStoredImage(business.logo_url) } catch {}
      }

      const { data: cats } = await (supabase.from('categories') as any)
        .select('image_url, items(image_url)')
        .eq('business_id', id)

      if (cats) {
        for (const cat of cats) {
          if (cat.image_url) {
            try { await deleteStoredImage(cat.image_url) } catch {}
          }
          for (const item of cat.items || []) {
            if (item.image_url) {
              try { await deleteStoredImage(item.image_url) } catch {}
            }
          }
        }
      }
    } catch (cleanupError: any) {
      // Log cleanup errors but don't fail the deletion.
      console.warn('Image cleanup warning:', cleanupError?.message)
    }

    // Delete the business (cascades categories, items, subscriptions).
    const { error: deleteError } = await (supabase
      .from('businesses') as any)
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Échec de la suppression du compte.' },
        { status: 500 }
      )
    }

    // The public menu is cached by slug — bust it so the deleted café drops live.
    try {
      revalidateTag(businessCacheTag(business.slug), 'max')
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Compte supprimé avec succès.',
    })
  } catch (error: any) {
    if (error?.digest?.startsWith?.('NEXT_REDIRECT') || error?.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }
    console.error('Delete business error:', error)
    const unauthorized = error.message?.includes('Unauthorized') || error.message?.includes('auth')
    return NextResponse.json(
      { error: unauthorized ? 'Non autorisé.' : 'Erreur serveur.' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}
