/**
 * Tell the server to bust this owner's PUBLIC menu cache after a save, so edits
 * appear on the live menu immediately (otherwise they show within the cache
 * TTL — see lib/db/business.ts). Fire-and-forget: it never blocks or breaks the
 * save flow, and the endpoint derives the slug from the session, so no args.
 *
 * Call this right after any successful write that changes what diners see
 * (menu items, categories, design, branding, SEO).
 */
export function revalidatePublicMenu(): void {
  try {
    fetch('/api/revalidate', { method: 'POST', keepalive: true }).catch(() => {})
  } catch {
    /* never let a cache ping interfere with saving */
  }
}
