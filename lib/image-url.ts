/**
 * Return the public URL for a stored image.
 *
 * Images are already optimized at UPLOAD time (sharp → WebP, downscaled to a
 * per-folder max edge, metadata stripped — see lib/storage-server), so we serve
 * those origins directly from the Supabase CDN.
 *
 * We deliberately do NOT use Supabase's on-the-fly render endpoint
 * (/storage/v1/render/image/...): it is a PAID Image-Transformation feature and
 * returns 403 "FeatureNotEnabled" on the free plan — which broke every menu
 * image. The `width`/`quality` args are kept so existing call sites compile, but
 * are intentionally not applied here.
 */
export function menuImageUrl(url: string | null | undefined, _width?: number, _quality = 62): string | null {
  if (!url || typeof url !== 'string') return url ?? null
  return url
}
