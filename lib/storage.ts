/**
 * Storage helpers — images live in Supabase Storage (public `menu-images` bucket).
 *
 * Flow:
 *   1. Client pre-compresses the file (lib/image-optimize) — less upload bandwidth
 *   2. /api/upload re-optimizes with sharp (WebP, max 1600px) and stores it
 *   3. The public URL is stored in DB columns (logo_url, image_url, …)
 *   4. Frontend renders straight from the Supabase CDN
 */
import { compressImage } from '@/lib/image-optimize'

// ─── Upload helpers ──────────────────────────────────────────────────

/** Upload any image; returns its public URL. */
export async function uploadImage(file: File, folder: string): Promise<string> {
  const optimized = await compressImage(file)
  const formData = new FormData()
  formData.append('file', optimized)
  formData.append('folder', folder)

  const response = await fetch('/api/upload', { method: 'POST', body: formData })
  const result = await response.json()

  if (!response.ok || !result.success || typeof result.secure_url !== 'string') {
    throw new Error(result.error || 'Échec du téléversement de l’image')
  }
  return result.secure_url
}

export async function uploadBusinessLogo(businessId: string, file: File): Promise<string> {
  return uploadImage(file, `logos/${businessId}`)
}

export async function uploadItemImage(itemId: string, file: File): Promise<string> {
  return uploadImage(file, `items/${itemId}`)
}

export async function uploadCategoryImage(categoryId: string, file: File): Promise<string> {
  return uploadImage(file, `categories/${categoryId}`)
}

// ─── Delete ──────────────────────────────────────────────────────────

/**
 * Best-effort delete of a stored image by its public URL.
 * Legacy URLs (Cloudinary, external) are skipped silently.
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  if (!imageUrl || !imageUrl.includes('/storage/v1/object/public/')) return
  try {
    const response = await fetch('/api/delete-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      console.warn('Image delete warning:', data.error || response.status)
    }
  } catch (err) {
    console.warn('Image delete warning:', err)
  }
}
