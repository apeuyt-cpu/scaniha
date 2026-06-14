/**
 * Server-side image optimization + Supabase Storage persistence.
 * Every uploaded image is re-encoded with sharp (EXIF-rotated, resized,
 * WebP, metadata stripped) and stored in the public `menu-images` bucket
 * with immutable cache headers — small files, fast loads, free CDN caching.
 */
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const STORAGE_BUCKET = 'menu-images'
const MAX_DIMENSION = 1600
const WEBP_QUALITY = 78

export interface StoredImage {
  url: string
  path: string
  width: number | null
  height: number | null
  bytes: number
  format: string
}

/** Keep folder names safe: lowercase segments of [a-z0-9_-], no traversal. */
export function sanitizeFolder(folder: unknown): string {
  if (typeof folder !== 'string' || !folder) return 'uploads'
  const cleaned = folder
    .toLowerCase()
    .split('/')
    .map((seg) => seg.replace(/[^a-z0-9_-]/g, ''))
    .filter(Boolean)
    .slice(0, 4)
    .join('/')
  return cleaned || 'uploads'
}

export async function optimizeAndStore(input: Buffer, mime: string, folder: string): Promise<StoredImage> {
  const animated = mime === 'image/gif'
  let pipeline = sharp(input, { animated, limitInputPixels: 64_000_000 })
  const meta = await pipeline.metadata()

  pipeline = pipeline
    .rotate() // honor EXIF orientation, then strip metadata
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 4 })

  const optimized = await pipeline.toBuffer()
  const path = `${sanitizeFolder(folder)}/${randomUUID()}.webp`

  const supabase = await createServiceRoleClient()
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, optimized, {
    contentType: 'image/webp',
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw new Error(`Stockage impossible : ${error.message}`)

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)

  const scale = Math.min(1, MAX_DIMENSION / Math.max(meta.width || 1, meta.height || 1))
  return {
    url: data.publicUrl,
    path,
    width: meta.width ? Math.round(meta.width * scale) : null,
    height: meta.height ? Math.round(meta.height * scale) : null,
    bytes: optimized.length,
    format: 'webp',
  }
}

/** Extract the bucket-relative path from a public storage URL (null if not ours). */
export function storagePathFromUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`
    const idx = u.pathname.indexOf(marker)
    if (idx === -1) return null
    const path = decodeURIComponent(u.pathname.slice(idx + marker.length))
    if (!path || path.includes('..')) return null
    return path
  } catch {
    return null
  }
}

export async function deleteStoredImage(url: string): Promise<boolean> {
  const path = storagePathFromUrl(url)
  if (!path) return false
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path])
  if (error) throw new Error(error.message)
  return true
}
