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
  /** Auto-advance interval in ms (clamped 2000–8000). */
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
  intervalMs: 4000,
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

/** Resolve the accent: owner override, else the design's built-in accent. */
export function resolveAccent(settings: DesignSettings, designId: DesignId): string {
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
  design11: [
    {
      key: 'specialButton',
      label: 'Bouton « Surprends-moi »',
      type: 'toggle',
      default: true,
      hint: 'Affiche un plat surprise tiré au sort parmi vos plats à la une.',
    },
  ],
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
  // Guard the numeric field.
  merged.intervalMs = Math.min(8000, Math.max(2000, Number(merged.intervalMs) || 4000))
  return merged
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
