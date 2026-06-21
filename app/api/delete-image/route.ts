import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { deleteStoredImage } from '@/lib/storage-server'

/**
 * POST /api/delete-image — { url }
 * Deletes an image from Supabase Storage by its public URL. Auth required.
 * Non-storage URLs (e.g. legacy Cloudinary) are ignored successfully.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Connexion requise.' }, { status: 401 })
    }

    const { url } = await request.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'URL manquante.' }, { status: 400 })
    }

    const admin = await createServiceRoleClient()

    // Super-admin may manage (and clean up) any business's images.
    const { data: prof } = await (admin.from('profiles') as any)
      .select('role').eq('user_id', user.id).maybeSingle()
    if (prof?.role === 'super_admin') {
      const deleted = await deleteStoredImage(url)
      return NextResponse.json({ success: true, deleted })
    }

    // Ownership check: only delete an image actually referenced by the caller's
    // own business (logo, a category/item image, or an authoritative design
    // image). Without this, any logged-in owner could delete another business's
    // images. The allowlist is built ONLY from real image fields compared by
    // strict equality — never a JSON.stringify(...).includes over design_settings,
    // because owners control free-text SEO fields and could plant a victim's URL.
    const { data: biz } = await (admin.from('businesses') as any)
      .select('id, logo_url, design_settings')
      .eq('owner_id', user.id)
      .maybeSingle()
    if (!biz) {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 })
    }
    const owned = new Set<string>()
    if (biz.logo_url) owned.add(biz.logo_url)
    const { data: cats } = await (admin.from('categories') as any)
      .select('id, image_url')
      .eq('business_id', biz.id)
    const catIds: string[] = []
    for (const c of (cats || []) as any[]) {
      catIds.push(c.id)
      if (c.image_url) owned.add(c.image_url)
    }
    if (catIds.length) {
      const { data: items } = await (admin.from('items') as any)
        .select('image_url')
        .in('category_id', catIds)
      for (const it of (items || []) as any[]) if (it.image_url) owned.add(it.image_url)
    }
    // Authoritative design_settings image keys ONLY (per-design coverImage +
    // the SEO share image). Free-text fields (metaTitle, contact, …) are excluded.
    const ds = (biz.design_settings || {}) as Record<string, any>
    for (const designId of ['design1', 'design2', 'design3', 'design6', 'design11', 'design12']) {
      const cover = ds[designId]?.coverImage
      if (typeof cover === 'string' && cover) owned.add(cover)
    }
    const shareImage = ds.seo?.shareImage
    if (typeof shareImage === 'string' && shareImage) owned.add(shareImage)
    if (!owned.has(url)) {
      return NextResponse.json({ success: false, error: 'Image non autorisée.' }, { status: 403 })
    }

    const deleted = await deleteStoredImage(url)
    return NextResponse.json({ success: true, deleted })
  } catch (error: any) {
    console.error('Delete image API Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Échec de la suppression.' },
      { status: 500 }
    )
  }
}
