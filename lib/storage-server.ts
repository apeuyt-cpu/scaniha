/**
 * Server-side image optimization + Supabase Storage persistence.
 * Every uploaded image is re-encoded with sharp (EXIF-rotated, resized,
 * metadata stripped) and stored in the public `menu-images` bucket with
 * immutable cache headers — small files, fast loads, free CDN caching.
 *
 * Format: menu photos (items/categories/covers) are encoded to BOTH AVIF and
 * WebP and the smaller wins — AVIF is ~40% lighter than WebP for photos, and
 * the Supabase render endpoint (used to serve every menu image) transcodes
 * AVIF origins to whatever the browser accepts, so there's no compatibility
 * cost. Logos/receipts stay WebP: a logo can be served as a raw origin
 * (favicon) where AVIF support is less universal, and that saving is trivial.
 */
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const STORAGE_BUCKET = 'menu-images'
const MAX_DIMENSION = 1600
const WEBP_QUALITY = 76
const AVIF_QUALITY = 52

/** Folders served as a raw origin (favicon) or kept maximally compatible → WebP only. */
const WEBP_ONLY_PREFIXES = new Set(['logos', 'receipts'])
function avifAllowed(folder: string): boolean {
  return !WEBP_ONLY_PREFIXES.has(folder.split('/')[0])
}

export interface StoredImage {
  url: string
  path: string
  width: number | null
  height: number | null
  bytes: number
  format: string
}

interface Encoded {
  buf: Buffer
  ext: 'webp' | 'avif'
  contentType: string
}

/**
 * Re-encode to the smallest of AVIF / WebP (WebP only for animated GIFs and
 * the WEBP_ONLY folders). Rotates by EXIF, downscales to MAX_DIMENSION, strips
 * metadata. Shared by the upload route and scripts/optimize-images.mjs.
 */
export async function encodeOptimized(input: Buffer, mime: string, folder: string): Promise<Encoded> {
  const animated = mime === 'image/gif'
  const base = sharp(input, { animated, limitInputPixels: 64_000_000 })
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })

  if (animated) {
    const buf = await base.webp({ quality: 70, effort: 4 }).toBuffer()
    return { buf, ext: 'webp', contentType: 'image/webp' }
  }

  const webp = await base.clone().webp({ quality: WEBP_QUALITY, effort: 4, smartSubsample: true }).toBuffer()
  if (avifAllowed(folder)) {
    const avif = await base.clone().avif({ quality: AVIF_QUALITY, effort: 4 }).toBuffer().catch(() => null)
    if (avif && avif.length < webp.length) return { buf: avif, ext: 'avif', contentType: 'image/avif' }
  }
  return { buf: webp, ext: 'webp', contentType: 'image/webp' }
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
  const safeFolder = sanitizeFolder(folder)
  const meta = await sharp(input, { limitInputPixels: 64_000_000 }).metadata()
  const { buf, ext, contentType } = await encodeOptimized(input, mime, safeFolder)
  const path = `${safeFolder}/${randomUUID()}.${ext}`

  const supabase = await createServiceRoleClient()
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, buf, {
    contentType,
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
    bytes: buf.length,
    format: ext,
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
