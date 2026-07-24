/** Allow-list for optional café-Wi-Fi-only ordering. Uses the customer's public
 * egress IPv4 address as seen by the deployment; supports exact IPs and CIDRs. */
export function sanitizeIpRules(value: unknown): string[] {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[\n,]/) : []
  return Array.from(new Set(values.map((item) => String(item).trim()).filter(isValidIpRule))).slice(0, 12)
}

export function isNetworkAllowed(ip: string, rules: string[]): boolean {
  return rules.some((rule) => matchesIpRule(ip, rule))
}

function isValidIpRule(value: string): boolean {
  const [address, prefix] = value.split('/')
  if (!isIpv4(address)) return false
  if (prefix === undefined) return true
  const bits = Number(prefix)
  return /^\d{1,2}$/.test(prefix) && Number.isInteger(bits) && bits >= 0 && bits <= 32
}

function matchesIpRule(ip: string, rule: string): boolean {
  const [address, prefix] = rule.split('/')
  if (!isIpv4(ip) || !isIpv4(address)) return false
  if (prefix === undefined) return ip === address
  const bits = Number(prefix)
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
  return (toIpv4(ip) & mask) === (toIpv4(address) & mask)
}

function isIpv4(value: string): boolean {
  const parts = value.split('.')
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

function toIpv4(value: string): number {
  return value.split('.').reduce((out, part) => ((out << 8) | Number(part)) >>> 0, 0)
}
