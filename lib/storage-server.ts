/**
 * Server-side image optimization + Supabase Storage persistence.
 * Every uploaded image is re-encoded with sharp (EXIF-rotated, resized,
 * metadata stripped) and stored in the public `menu-images` bucket with
 * immutable cache headers — small files, fast loads, free CDN caching.
 *
 * Format: everything is encoded to WebP. We serve these origins DIRECTLY (the
 * paid Supabase render endpoint that used to transcode them is disabled on the
 * free plan — see lib/image-url), so the stored format must be universally
 * decodable in the browser. WebP is (Chrome/Firefox/Edge/Safari 14+). AVIF would
 * be ~30% smaller but isn't safe to serve raw to every visitor, so we don't use it.
 */
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const STORAGE_BUCKET = 'menu-images'

/**
 * Per-folder optimization profiles. `max` is the long-edge cap in px — the
 * single biggest lever on file size; `webp`/`avif` are encoder qualities
 * (avif:null → WebP only, for logos/receipts that must stay maximally
 * compatible). Tuned for the smallest file that still looks good, so the
 * Supabase free-tier storage + bandwidth go as far as possible.
 */
interface Profile { max: number; webp: number; avif: number | null }
// avif:null everywhere — origins are served raw on the free plan, so WebP (which
// every browser decodes) is the safe format. `max` is the long-edge cap in px,
// tuned to the size each image is actually shown at (×2 for retina), since we no
// longer downscale per display context.
const PROFILES: Record<string, Profile> = {
  logos:      { max: 512,  webp: 82, avif: null }, // small on screen; crisp
  items:      { max: 1080, webp: 74, avif: null }, // menu item photos
  categories: { max: 1080, webp: 74, avif: null },
  covers:     { max: 1500, webp: 74, avif: null }, // wide hero / cover
  receipts:   { max: 1500, webp: 72, avif: null }, // legibility over beauty
  uploads:    { max: 1200, webp: 74, avif: null }, // default bucket
}
const DEFAULT_PROFILE: Profile = PROFILES.uploads

function profileFor(folder: string): Profile {
  return PROFILES[folder.split('/')[0]] ?? DEFAULT_PROFILE
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
 * profiles with avif:null). Rotates by EXIF, downscales to the folder profile's
 * max edge, strips metadata. High `effort` squeezes out extra bytes at no
 * quality cost — uploads are infrequent, so the slower encode is worth it.
 */
export async function encodeOptimized(input: Buffer, mime: string, folder: string): Promise<Encoded> {
  const { max, webp: webpQ, avif: avifQ } = profileFor(folder)
  const animated = mime === 'image/gif'
  const base = sharp(input, { animated, limitInputPixels: 64_000_000 })
    .rotate()
    .resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })

  if (animated) {
    const buf = await base.webp({ quality: 68, effort: 4 }).toBuffer()
    return { buf, ext: 'webp', contentType: 'image/webp' }
  }

  const webp = await base.clone().webp({ quality: webpQ, effort: 6, smartSubsample: true }).toBuffer()
  if (avifQ != null) {
    const avif = await base.clone().avif({ quality: avifQ, effort: 5 }).toBuffer().catch(() => null)
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

  const scale = Math.min(1, profileFor(safeFolder).max / Math.max(meta.width || 1, meta.height || 1))
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
