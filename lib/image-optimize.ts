/**
 * Client-side image pre-compression — runs in the browser BEFORE upload so
 * large phone photos (3–10 MB) leave the device as small WebP files
 * (usually 50–250 KB). The server re-optimizes with sharp regardless, so
 * any failure here safely falls back to the original file.
 */

const MAX_DIMENSION = 1600
const QUALITY = 0.82
/** Files already smaller than this skip client compression. */
const SKIP_BELOW_BYTES = 200 * 1024

export async function compressImage(file: File): Promise<File> {
  try {
    // GIFs (animation) and SVGs are not canvas-safe; tiny files aren't worth it.
    if (!file.type.startsWith('image/')) return file
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file
    if (file.size < SKIP_BELOW_BYTES) return file
    if (typeof createImageBitmap !== 'function') return file

    // `from-image` bakes EXIF orientation into the pixels — without it the
    // canvas re-encode strips the orientation tag and portrait phone photos
    // would upload sideways. Unsupported browsers ignore the option harmlessly.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', QUALITY)
    )
    if (!blob || blob.size === 0) return file
    // Only keep the compressed version when it actually helps.
    if (blob.size >= file.size) return file

    const name = file.name.replace(/\.[^.]+$/, '') + '.webp'
    return new File([blob], name, { type: 'image/webp' })
  } catch {
    return file
  }
}
