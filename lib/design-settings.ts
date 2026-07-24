// Per-design settings for the 4 menu design templates.
// Stored as a JSONB column `businesses.design_settings`, keyed by design id:
//   { "design1": {...}, "design2": {...}, "design3": {...}, "design4": {...} }
// Everything is optional and merged over DEFAULTS so missing config never breaks a menu.

export type DesignId =
  | 'design1'
  | 'design2'
  | 'design3'
  | 'design6'
  | 'design11'
  | 'design12'

export interface DesignSettings {
  /** Show the auto-sliding showcase / "À la une" banner. */
  showcase: boolean
  /** What the showcase rotates through. */
  source: 'random' | 'manual'
  /** Item ids shown when source === 'manual'. */
  featuredIds: (string | number)[]
  /** Auto-advance the showcase. */
  autoSlide: boolean
  /** Auto-advance interval in ms (clamped 1000–8000; default 1s). */
  intervalMs: number
  /** Showcase heading. */
  title: string
  /** Optional sub-line under the title. */
  subtitle: string
  /** Show prices on cards. */
  showPrices: boolean
  /** Show item descriptions (designs 1 & 2). */
  showDescriptions: boolean
  /** Show the logo / brand avatar in the header. */
  showLogo: boolean
  /** Editable welcome line shown in the header. */
  tagline: string
  /** Optional cover/banner image URL (used by designs with a hero). */
  coverImage: string | null
  /** Optional accent color override (hex). Falls back to the design's built-in accent. */
  accent: string | null
  /** Custom brand gradient (buttons, dock, price chips, headers) — used when gradientEnabled. */
  gradientEnabled: boolean
  gradientFrom: string
  gradientTo: string
  gradientAngle: number
  /** Show unavailable items (greyed + "Épuisé" badge) instead of hiding them. */
  showSoldOut: boolean
  /** Show the contact / hours footer block. */
  contactEnabled: boolean
  /** Contact details shown in the footer (when contactEnabled). */
  address: string
  hours: string
  phone: string
  /** Design-specific extra options (declared in DESIGN_EXTRAS). */
  extras: Record<string, any>
}

const BASE: Omit<DesignSettings, 'title' | 'subtitle' | 'tagline'> = {
  showcase: true,
  source: 'random',
  featuredIds: [],
  autoSlide: true,
  intervalMs: 1000,
  showPrices: true,
  showDescriptions: true,
  showLogo: true,
  coverImage: null,
  accent: null,
  gradientEnabled: false,
  gradientFrom: '#F47B20',
  gradientTo: '#F5B82E',
  gradientAngle: 135,
  showSoldOut: false,
  contactEnabled: false,
  address: '',
  hours: '',
  phone: '',
  extras: {},
}

export const DEFAULTS: Record<DesignId, DesignSettings> = {
  design1: { ...BASE, title: 'Spécial du Jour', subtitle: 'Notre sélection du jour', tagline: '' },
  design2: { ...BASE, title: 'Spécialités du Chef', subtitle: '', tagline: 'Découvrez les créations spéciales de notre chef.' },
  design3: { ...BASE, title: 'À la une', subtitle: '', tagline: 'Découvrez de délicieux plats.' },
  design6: { ...BASE, showcase: false, title: 'À la une', subtitle: '', tagline: '' },
  design11: { ...BASE, title: 'À la une', subtitle: 'Nos incontournables', tagline: '' },
  design12: { ...BASE, showcase: false, title: 'À la une', subtitle: '', tagline: '' },
}

export function isDesignId(id: string): id is DesignId {
  return /^design([1-36]|1[12])$/.test(id)
}

/**
 * Built-in accent color for each design (used when no override is set).
 * Aligned to the Scaniha brand orange #F47B20 (→ amber #F5B82E) so prices,
 * chips and chevrons reinforce the brand rather than competing with it.
 */
export const DESIGN_ACCENTS: Record<DesignId, string> = {
  design1: '#F47B20',
  design2: '#F59E0B',
  design3: '#F47B20',
  design6: '#F47B20',
  design11: '#F47B20',
  design12: '#F47B20',
}

/**
 * Resolve the single FLAT accent colour for a design — used everywhere a design
 * paints a solid brand element (price text, icons, chips, focus rings, shadows).
 *
 * The two appearance modes are mutually exclusive and BOTH must apply across the
 * whole menu:
 *  - Gradient mode (gradientEnabled): the flat accent is derived from the
 *    gradient's start colour, so solid elements harmonise with the gradient
 *    instead of staying the old flat/brand colour.
 *  - Flat mode: the owner's accent, else the design's built-in accent.
 */
export function resolveAccent(settings: DesignSettings, designId: DesignId): string {
  if (settings.gradientEnabled && settings.gradientFrom) return settings.gradientFrom
  return settings.accent || DESIGN_ACCENTS[designId]
}

/**
 * Resolve the active brand gradient string (CSS) for a design:
 *  - the owner's custom gradient when enabled,
 *  - else a flat sweep of their custom accent (so the menu reflects their colour),
 *  - else the default Scaniha brand sweep (orange → amber).
 * Used everywhere a design previously hard-coded brandGradient() (dock, buttons,
 * price chips, headers) so "full control on the appearance" actually applies.
 */
export function resolveGradient(settings: DesignSettings, designId: DesignId): string {
  const angle = Number.isFinite(settings.gradientAngle) ? settings.gradientAngle : 135
  if (settings.gradientEnabled && settings.gradientFrom && settings.gradientTo) {
    return `linear-gradient(${angle}deg, ${settings.gradientFrom}, ${settings.gradientTo})`
  }
  if (settings.accent) {
    const a = settings.accent
    return `linear-gradient(135deg, ${a}, ${a})`
  }
  const a = DESIGN_ACCENTS[designId] || '#F47B20'
  return a === '#F47B20' ? 'linear-gradient(135deg, #F47B20, #F5B82E)' : `linear-gradient(135deg, ${a}, ${a})`
}

// ─── Per-design feature capabilities ─────────────────────────────────
// Which built-in controls actually do something for each design, so the admin
// panel only shows relevant settings (e.g. no "banner" for the editorial
// designs that don't render one) and never hides a control a design supports.

export interface DesignFeatures {
  /** Renders a cover / banner image. */
  cover: boolean
  /** Label + hint for the cover control (placement differs per design). */
  coverLabel: string
  coverHint: string
  /** Renders the auto-sliding "À la une" showcase. */
  showcase: boolean
  /** Shows the header tagline / welcome line. */
  tagline: boolean
  /** Renders item descriptions. */
  descriptions: boolean
}

export const DESIGN_FEATURES: Record<DesignId, DesignFeatures> = {
  design1: { cover: true, coverLabel: 'Bannière du menu', coverHint: 'Grande image affichée tout en haut du menu.', showcase: true, tagline: true, descriptions: true },
  design2: { cover: true, coverLabel: "Image de l'en-tête", coverHint: "Sert de fond à la grande carte d'en-tête sombre.", showcase: false, tagline: true, descriptions: true },
  design3: { cover: true, coverLabel: 'Bannière', coverHint: '', showcase: true, tagline: true, descriptions: true },
  design6: { cover: false, coverLabel: '', coverHint: '', showcase: true, tagline: true, descriptions: true },
  design11: { cover: true, coverLabel: 'Image de couverture', coverHint: 'Photo plein écran en haut, effet vitrine.', showcase: true, tagline: true, descriptions: true },
  design12: { cover: false, coverLabel: '', coverHint: '', showcase: false, tagline: false, descriptions: true },
}

/** Feature capabilities for a design (falls back to design1's set). */
export function getDesignFeatures(designId: DesignId): DesignFeatures {
  return DESIGN_FEATURES[designId] || DESIGN_FEATURES.design1
}

// ─── Design-specific extra options ───────────────────────────────────
// Each design declares its own special parameters; the admin panel renders
// them automatically and the design reads them via getExtra().

export interface DesignExtraOption {
  key: string
  label: string
  type: 'toggle' | 'choice' | 'text'
  /** For type 'choice'. */
  choices?: { value: string; label: string }[]
  default: any
  hint?: string
  /** For type 'text'. */
  placeholder?: string
}

export const DESIGN_EXTRAS: Record<DesignId, DesignExtraOption[]> = {
  design1: [
    {
      key: 'density',
      label: 'Densité de la liste',
      type: 'choice',
      choices: [
        { value: 'confort', label: 'Confort' },
        { value: 'compact', label: 'Compact' },
      ],
      default: 'confort',
      hint: 'Compact affiche plus de plats à l’écran.',
    },
  ],
  design2: [],
  design3: [],
  design6: [
    {
      key: 'showThumbnails',
      label: 'Afficher les miniatures rondes',
      type: 'toggle',
      default: true,
      hint: 'Désactivez pour une carte 100 % typographique.',
    },
  ],
  design11: [],
  design12: [],
}

/** Read a design-specific extra with its declared default. */
export function getExtra<T = any>(settings: DesignSettings, designId: DesignId, key: string): T {
  const declared = DESIGN_EXTRAS[designId]?.find((o) => o.key === key)
  const v = settings.extras?.[key]
  return (v === undefined || v === null || v === '' ? declared?.default : v) as T
}

/** Merge a business's stored settings for one design over the defaults. */
export function getDesignSettings(business: any, designId: DesignId): DesignSettings {
  const stored = business?.design_settings?.[designId]
  const merged: DesignSettings = { ...DEFAULTS[designId], ...(stored && typeof stored === 'object' ? stored : {}) }
  // Contact & hours are BRAND-level now (managed in the Marque tab): they live in
  // design_settings.contact and override any legacy per-design value here.
  const contact = business?.design_settings?.contact
  if (contact && typeof contact === 'object') {
    merged.contactEnabled = !!contact.enabled
    merged.phone = String(contact.phone ?? '')
    merged.address = String(contact.address ?? '')
    merged.hours = String(contact.hours ?? '')
  }
  // Guard the numeric field. Floor is 1s (snappy) up to 8s.
  merged.intervalMs = Math.min(8000, Math.max(1000, Number(merged.intervalMs) || 2000))
  return merged
}

/** Brand-level contact block (shared across designs), edited in the Marque tab. */
export function getBrandContact(business: any): { enabled: boolean; phone: string; address: string; hours: string } {
  const c = business?.design_settings?.contact
  return {
    enabled: !!(c && c.enabled),
    phone: String(c?.phone ?? ''),
    address: String(c?.address ?? ''),
    hours: String(c?.hours ?? ''),
  }
}

/**
 * Master "fidelity system" switch (business-wide sibling key in design_settings).
 * OFF → the business is a PURE QR menu: no bottom nav, no profile page, no
 * roulette, no loyalty/points. ON → the full engagement layer appears.
 * Defaults ON — both products (menu + fidélité) are live unless the owner turns
 * fidelity off here, or the super-admin sets products='menu'.
 */
export function isFidelityEnabled(business: any): boolean {
  return business?.design_settings?.loyaltyEnabled !== false
}

export type ProductMode = 'menu' | 'fidelity' | 'both'

/**
 * The product(s) a café is provisioned for — a business-wide sibling key in
 * design_settings. This is the PLAN CEILING, set by the super-admin (and, within
 * it, the owner). `loyaltyEnabled` stays the owner's within-plan on/off switch.
 *   undefined → legacy: behave exactly as before this field existed.
 */
export function getProductMode(business: any): ProductMode | undefined {
  const p = business?.design_settings?.products
  return p === 'menu' || p === 'fidelity' || p === 'both' ? p : undefined
}

/**
 * The EFFECTIVE customer mode that drives the home screen + navigation. Combines
 * the product ceiling with the fidelity toggle so existing cafés (no `products`
 * set) keep today's exact behaviour.
 *   'menu'     → QR menu only
 *   'fidelity' → loyalty hub only (no digital menu)
 *   'both'     → menu + fidelity
 */
export function resolveMode(business: any): ProductMode {
  switch (getProductMode(business)) {
    case 'fidelity':
      return 'fidelity'
    case 'menu':
      return 'menu'
    // 'both' OR legacy (unset) → respect the master fidelity toggle.
    default:
      return isFidelityEnabled(business) ? 'both' : 'menu'
  }
}

/**
 * Whether fidelity surfaces are LIVE for customers — respects the product
 * ceiling. Use this for ALL customer-facing gates (menu bottom nav, roulette
 * button, /fidelite, public game/loyalty APIs). `isFidelityEnabled` is only the
 * owner's master toggle and ignores `products`, so a 'menu' plan would still
 * leak fidelity if gated on it. Identical to isFidelityEnabled for legacy cafés
 * (no `products` set), so no behaviour change there.
 */
export function isFidelityLive(business: any): boolean {
  return resolveMode(business) !== 'menu'
}

export type FidelityLanding = 'carte' | 'boutique' | 'roue'

/**
 * Which page the fidelity hub opens on by default (the "front door" the owner
 * sets, so the QR/nav doesn't always land on the roulette). Business-wide sibling
 * key in design_settings. Defaults to 'carte'. The hub falls back to 'carte' if
 * 'roue' is chosen while the roulette is off.
 */
export function fidelityLanding(business: any): FidelityLanding {
  const v = business?.design_settings?.fidelityLanding
  return v === 'boutique' || v === 'roue' ? v : 'carte'
}

/**
 * Whether the QR menu also exposes the fidelity program (the bottom-nav Fidélité
 * tab), i.e. whether the MENU QR "works for both". Business-wide sibling key in
 * design_settings. Defaults ON (true) — existing 'both' cafés are unchanged. Only
 * meaningful when fidelity is live; turn OFF to keep the menu QR menu-only.
 */
export function menuShowsFidelity(business: any): boolean {
  return business?.design_settings?.menuShowsFidelity !== false
}

export interface OrderingConfig {
  enabled: boolean
  qrKey: string
  ttlMin: number
  tables: number
  /** Reject orders unless the customer uses the café's configured Wi-Fi egress IP. */
  wifiOnly: boolean
  wifiCidrs: string[]
  /** Reject orders unless the customer is physically near these coordinates (GPS). */
  gpsOnly: boolean
  gpsLat: number | null
  gpsLng: number | null
  gpsRadius: number
}

/**
 * Table-ordering config (business-wide sibling key in design_settings.ordering).
 * Defaults OFF — opt-in. `qrKey` signs the per-table presence QR; `ttlMin` is how
 * long after a scan a diner may order (default 120 min — a sitting); `tables` is
 * how many numbered table QRs the owner wants to generate.
 */
export function orderingConfig(business: any): OrderingConfig {
  const o = business?.design_settings?.ordering
  const ttl = Number(o?.ttlMin)
  const tables = Number(o?.tables)
  const gpsLat = Number(o?.gpsLat)
  const gpsLng = Number(o?.gpsLng)
  return {
    enabled: Boolean(o?.enabled),
    qrKey: typeof o?.qrKey === 'string' ? o.qrKey : '',
    ttlMin: Number.isFinite(ttl) && ttl > 0 ? Math.min(60, Math.max(5, Math.round(ttl))) : 15,
    tables: Number.isFinite(tables) && tables > 0 ? Math.min(200, Math.round(tables)) : 0,
    wifiOnly: Boolean(o?.wifiOnly),
    wifiCidrs: Array.isArray(o?.wifiCidrs) ? o.wifiCidrs.filter((v: unknown) => typeof v === 'string').slice(0, 12) : [],
    gpsOnly: Boolean(o?.gpsOnly),
    gpsLat: Number.isFinite(gpsLat) ? gpsLat : null,
    gpsLng: Number.isFinite(gpsLng) ? gpsLng : null,
    gpsRadius: Number.isFinite(Number(o?.gpsRadius)) ? Math.max(10, Math.round(Number(o.gpsRadius))) : 100,
  }
}

/** Whether table ordering is LIVE for customers (enabled AND a key exists). */
export function isOrderingLive(business: any): boolean {
  const o = orderingConfig(business)
  return o.enabled && o.qrKey.length > 0
}

export interface PromoConfig { enabled: boolean; message: string; emoji: string; until: string | null }

/**
 * Time-bound promo banner shown above the public menu (business-wide sibling key
 * design_settings.promo). e.g. "Happy hour 17h–19h : -20% sur les boissons".
 * `until` (ISO date) auto-expires it. Defaults OFF.
 */
export function promoConfig(business: any): PromoConfig {
  const p = business?.design_settings?.promo
  return {
    enabled: Boolean(p?.enabled),
    message: typeof p?.message === 'string' ? p.message : '',
    emoji: typeof p?.emoji === 'string' ? p.emoji : '',
    until: typeof p?.until === 'string' && p.until ? p.until : null,
  }
}

/** Whether the promo banner should show right now (enabled, has text, not expired). */
export function isPromoLive(business: any): boolean {
  const p = promoConfig(business)
  if (!p.enabled || !p.message.trim()) return false
  if (p.until) {
    const t = new Date(p.until).getTime()
    if (Number.isFinite(t) && t < Date.now()) return false
  }
  return true
}

type AnyItem = { id: string | number; available?: boolean }

/** Deterministic-ish shuffle seeded by a number (so SSR/CSR agree per render seed). */
function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed || 1
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Resolve which items the showcase should display.
 * - manual: the chosen featuredIds (in order), filtered to available items
 * - random: a shuffled sample (default 6)
 * Pass a `seed` to keep the order stable across re-renders within a session.
 */
export function resolveShowcaseItems<T extends AnyItem>(
  settings: DesignSettings,
  allItems: T[],
  opts: { count?: number; seed?: number } = {}
): T[] {
  const count = opts.count ?? 6
  const available = (allItems || []).filter((it) => it && it.available !== false)

  if (settings.source === 'manual') {
    const byId = new Map(available.map((it) => [String(it.id), it]))
    const picked = settings.featuredIds
      .map((id) => byId.get(String(id)))
      .filter((it): it is T => Boolean(it))
    return picked.length > 0 ? picked : available.slice(0, count)
  }

  return shuffle(available, opts.seed ?? available.length).slice(0, count)
}
