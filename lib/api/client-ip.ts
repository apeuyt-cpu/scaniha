/**
 * Best-effort real client IP for rate-limiting.
 *
 * Defends against X-Forwarded-For spoofing: a client can PREPEND arbitrary IPs to
 * `x-forwarded-for`, so the FIRST entry is attacker-controlled and must never be
 * trusted for rate-limit keys (rotating it bypasses the limit entirely). The
 * trusted proxy (Vercel) sets `x-real-ip` to the real peer and APPENDS the real
 * IP to `x-forwarded-for`, so we prefer `x-real-ip`, then the LAST forwarded hop.
 */
export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  const real = req.headers.get('x-real-ip')
  if (real && real.trim()) return real.trim()
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean)
    if (parts.length) return parts[parts.length - 1]
  }
  return 'unknown'
}
