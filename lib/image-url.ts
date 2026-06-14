/**
 * Serve menu images at the size they're actually displayed.
 *
 * Stored images are up to ~900px wide, but a menu shows them as 64–400px
 * thumbnails — sending the full file for every item is the main reason menus
 * felt slow. Supabase Storage can resize on the fly via its render endpoint;
 * browsers also get WebP/AVIF automatically through content negotiation, so a
 * single resized URL is small everywhere.
 *
 * Only rewrites our own Supabase public-storage URLs; anything else (legacy
 * Cloudinary, external) is returned untouched.
 */
const PUBLIC_MARKER = '/storage/v1/object/public/'

export function menuImageUrl(url: string | null | undefined, width: number, quality = 62): string | null {
  if (!url || typeof url !== 'string') return url ?? null
  const i = url.indexOf(PUBLIC_MARKER)
  if (i === -1) return url
  const base = url.slice(0, i)
  const path = url.slice(i + PUBLIC_MARKER.length)
  return `${base}/storage/v1/render/image/public/${path}?width=${width}&quality=${quality}&resize=contain`
}
