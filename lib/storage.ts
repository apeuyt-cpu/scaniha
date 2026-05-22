/**
 * Storage helpers — ALL image operations go through Cloudinary.
 * Supabase is NEVER used for image storage.
 *
 * Flow:
 *   1. Client uploads file to /api/upload (existing route)
 *   2. Server uploads to Cloudinary, returns secure_url + public_id
 *   3. secure_url is stored in Supabase DB columns (logo_url, image_url, etc.)
 *   4. Frontend renders images directly from Cloudinary CDN
 */

// ─── Upload helpers (via the existing /api/upload route) ─────────────

/**
 * Upload a business logo to Cloudinary.
 * Returns the Cloudinary secure_url.
 */
export async function uploadBusinessLogo(businessId: string, file: File): Promise<string> {
  return uploadToCloudinaryViaApi(file, `logos/${businessId}`)
}

/**
 * Upload an item image to Cloudinary.
 * Returns the Cloudinary secure_url.
 */
export async function uploadItemImage(itemId: string, file: File): Promise<string> {
  return uploadToCloudinaryViaApi(file, `items/${itemId}`)
}

/**
 * Upload a category image to Cloudinary.
 * Returns the Cloudinary secure_url.
 */
export async function uploadCategoryImage(categoryId: string, file: File): Promise<string> {
  return uploadToCloudinaryViaApi(file, `categories/${categoryId}`)
}

/**
 * Delete an image from Cloudinary by its URL.
 * Extracts the public_id from the Cloudinary URL and calls the delete API.
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  if (!imageUrl || !imageUrl.includes('res.cloudinary.com')) {
    // Not a Cloudinary URL — skip silently (legacy Supabase URL or null)
    return
  }

  try {
    const publicId = extractPublicIdFromUrl(imageUrl)
    if (!publicId) return

    const response = await fetch('/api/cloudinary-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId }),
    })

    if (!response.ok) {
      const data = await response.json()
      console.warn('Cloudinary delete warning:', data.error || 'Unknown error')
    }
  } catch (err) {
    // Best-effort deletion — don't throw
    console.warn('Image delete warning:', err)
  }
}

// ─── Internal helpers ────────────────────────────────────────────────

/**
 * Upload a file to Cloudinary through the existing /api/upload route.
 * This reuses the server-side Cloudinary upload logic.
 */
async function uploadToCloudinaryViaApi(file: File, folder?: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  if (folder) {
    formData.append('folder', folder)
  }

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Upload to Cloudinary failed')
  }

  return result.secure_url
}

/**
 * Extract Cloudinary public_id from a secure_url.
 * E.g., "https://res.cloudinary.com/xxx/image/upload/v123/my-app/photo.jpg"
 *       → "my-app/photo"
 */
function extractPublicIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')

    // Find the index of 'upload' in the path
    const uploadIndex = pathParts.indexOf('upload')
    if (uploadIndex === -1) return null

    // Everything after 'upload/vXXX/' is the public_id (without extension)
    // Skip version segment (starts with 'v' followed by digits)
    let startIndex = uploadIndex + 1
    if (pathParts[startIndex] && /^v\d+$/.test(pathParts[startIndex])) {
      startIndex++
    }

    const publicIdWithExt = pathParts.slice(startIndex).join('/')
    // Remove file extension
    const lastDotIndex = publicIdWithExt.lastIndexOf('.')
    return lastDotIndex > -1 ? publicIdWithExt.substring(0, lastDotIndex) : publicIdWithExt
  } catch {
    return null
  }
}
