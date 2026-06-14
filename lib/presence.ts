/**
 * "Presence" enforcement — decide whether a request is physically in the café.
 *
 * A browser CANNOT read the Wi-Fi SSID, so we approximate "in the café" two ways:
 *  - Wi-Fi: the café's public IP (every device on its Wi-Fi shares it),
 *  - GPS: a geofence (coords within N meters of the café).
 * All checks run SERVER-SIDE; the client only supplies optional GPS coords.
 */
import type { NextRequest } from 'next/server'
import type { PresenceConfig } from '@/lib/game'

/** The caller's public IP. On Vercel the leftmost x-forwarded-for entry is the real client. */
export function getClientIp(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return normalizeIp(first)
  }
  const real = req.headers.get('x-real-ip')
  return real ? normalizeIp(real.trim()) : null
}

function normalizeIp(ip: string): string {
  let v = ip.trim()
  if (v.startsWith('::ffff:')) v = v.slice(7) // IPv4-mapped IPv6
  const pct = v.indexOf('%')
  if (pct !== -1) v = v.slice(0, pct) // strip zone id
  return v.toLowerCase()
}

function isIPv4(ip: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip)
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.').map((p) => Number(p))
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
}

function ipv4InCidr(ip: string, cidr: string): boolean {
  const [range, bitsRaw] = cidr.split('/')
  const bits = Number(bitsRaw)
  const a = ipv4ToInt(ip)
  const b = ipv4ToInt(range)
  if (a === null || b === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false
  if (bits === 0) return true
  const mask = (0xffffffff << (32 - bits)) >>> 0
  return ((a & mask) >>> 0) === ((b & mask) >>> 0)
}

/** First 4 hextets (the /64 prefix) of a (possibly compressed) IPv6 address. */
function ipv6Prefix64(ip: string): string | null {
  if (!ip.includes(':')) return null
  let groups: string[]
  const dbl = ip.split('::')
  if (dbl.length === 2) {
    const head = dbl[0] ? dbl[0].split(':') : []
    const tail = dbl[1] ? dbl[1].split(':') : []
    const missing = 8 - (head.length + tail.length)
    groups = [...head, ...Array(Math.max(0, missing)).fill('0'), ...tail]
  } else {
    groups = ip.split(':')
  }
  if (groups.length < 4) return null
  return groups.slice(0, 4).map((g) => (g === '' ? '0' : g).padStart(4, '0')).join(':')
}

export function ipAllowed(ip: string | null, ips: string[]): boolean {
  if (!ip || !Array.isArray(ips) || ips.length === 0) return false
  const v = ip.trim().toLowerCase()
  for (const raw of ips) {
    const entry = String(raw).trim().toLowerCase()
    if (!entry) continue
    if (entry === v) return true
    if (entry.includes('/') && isIPv4(v) && isIPv4(entry.split('/')[0]) && ipv4InCidr(v, entry)) return true
    // IPv6: a device's suffix rotates (privacy extensions) but the café /64 prefix is stable.
    if (v.includes(':') && entry.includes(':')) {
      const a = ipv6Prefix64(v)
      const b = ipv6Prefix64(entry.split('/')[0])
      if (a && b && a === b) return true
    }
  }
  return false
}

export function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export type PresenceCheck =
  | { ok: true }
  | { ok: false; reason: 'network' | 'location' | 'need_location' }

/**
 * Decide whether a request is "in the café" per the owner's rule.
 *  - 'ip'   → the public IP must match the allowlist.
 *  - 'geo'  → coords must be within radius (missing coords → need_location).
 *  - 'both' → either passes.
 */
export function checkPresence(
  cfg: PresenceConfig,
  ctx: { ip: string | null; lat?: number | null; lng?: number | null }
): PresenceCheck {
  if (!cfg || !cfg.enabled) return { ok: true }

  const hasCoords = typeof ctx.lat === 'number' && typeof ctx.lng === 'number'
  const geoOk =
    !!cfg.geo && hasCoords &&
    haversineMeters(ctx.lat as number, ctx.lng as number, cfg.geo.lat, cfg.geo.lng) <= cfg.geo.radiusM
  const ipOk = ipAllowed(ctx.ip, cfg.ips)

  if (cfg.mode === 'ip') return ipOk ? { ok: true } : { ok: false, reason: 'network' }

  if (cfg.mode === 'geo') {
    if (!cfg.geo) return { ok: true } // geo mode but no location set → don't lock everyone out
    if (!hasCoords) return { ok: false, reason: 'need_location' }
    return geoOk ? { ok: true } : { ok: false, reason: 'location' }
  }

  // 'both' → pass if either matches.
  if (ipOk || geoOk) return { ok: true }
  if (cfg.geo && !hasCoords) return { ok: false, reason: 'need_location' }
  return { ok: false, reason: 'network' }
}
