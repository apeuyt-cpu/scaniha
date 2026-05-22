import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin()
    
    const { id } = await params
    const supabase = await createServiceRoleClient()
    
    // First, get the business to check if it exists and get logo_url for cleanup
    const { data: business, error: fetchError } = await (supabase
      .from('businesses') as any)
      .select('id, logo_url, owner_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Clean up Cloudinary images if they exist
    try {
      const { deleteFromCloudinary } = await import('@/lib/cloudinary')

      // Helper to extract Cloudinary public_id from URL
      const extractPublicId = (url: string): string | null => {
        try {
          if (!url || !url.includes('res.cloudinary.com')) return null
          const urlObj = new URL(url)
          const parts = urlObj.pathname.split('/')
          const uploadIdx = parts.indexOf('upload')
          if (uploadIdx === -1) return null
          let start = uploadIdx + 1
          if (parts[start] && /^v\d+$/.test(parts[start])) start++
          const withExt = parts.slice(start).join('/')
          const dotIdx = withExt.lastIndexOf('.')
          return dotIdx > -1 ? withExt.substring(0, dotIdx) : withExt
        } catch { return null }
      }

      // Delete logo from Cloudinary
      if (business.logo_url) {
        const logoPublicId = extractPublicId(business.logo_url)
        if (logoPublicId) {
          try { await deleteFromCloudinary(logoPublicId) } catch {}
        }
      }

      // Delete item and category images from Cloudinary
      const { data: cats } = await (supabase.from('categories') as any)
        .select('image_url, items(image_url)')
        .eq('business_id', id)

      if (cats) {
        for (const cat of cats) {
          if (cat.image_url) {
            const pid = extractPublicId(cat.image_url)
            if (pid) { try { await deleteFromCloudinary(pid) } catch {} }
          }
          if (cat.items) {
            for (const item of cat.items) {
              if (item.image_url) {
                const pid = extractPublicId(item.image_url)
                if (pid) { try { await deleteFromCloudinary(pid) } catch {} }
              }
            }
          }
        }
      }
    } catch (cleanupError: any) {
      // Log cleanup errors but don't fail the deletion
      console.warn('Cloudinary cleanup warning:', cleanupError.message)
    }

    // Delete the business (this will cascade delete categories, items, subscriptions)
    const { error: deleteError } = await (supabase
      .from('businesses') as any)
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete business' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Business deleted successfully' 
    })
  } catch (error: any) {
    console.error('Delete business error:', error)
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    )
  }
}

