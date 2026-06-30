// Scaniha POS — per-tenant config read from design_settings.pos (no extra table,
// same pattern as orderingConfig in lib/design-settings.ts). FR/TND locked.

export interface PosConfig {
  enabled: boolean
  currency: 'TND'
  tvaDefault: number          // default VAT rate (informational; prices are TTC)
  quickDiscounts: number[]    // % buttons in the cart
  paymentMethods: ('cash' | 'card')[]
  requirePinForVoid: boolean
  requirePinForDiscount: boolean
  requireShift: boolean
  tableMode: boolean
  ticketHeader: string
  ticketFooter: string
  printLogo: boolean
}

const DEFAULTS: PosConfig = {
  enabled: false,
  currency: 'TND',
  tvaDefault: 0,
  quickDiscounts: [5, 10, 15, 20],
  paymentMethods: ['cash', 'card'],
  requirePinForVoid: false,
  requirePinForDiscount: false,
  requireShift: false,
  tableMode: false,
  ticketHeader: '',
  ticketFooter: 'Merci de votre visite',
  printLogo: true,
}

function clampPct(n: any, fallback: number): number {
  const v = Number(n)
  if (!Number.isFinite(v) || v < 0 || v > 100) return fallback
  return v
}

/** Read design_settings.pos merged over locked defaults. */
export function posConfig(business: any): PosConfig {
  const raw = (business?.design_settings && typeof business.design_settings === 'object'
    ? (business.design_settings as any).pos
    : null) || {}
  const quick = Array.isArray(raw.quickDiscounts)
    ? raw.quickDiscounts.map((x: any) => clampPct(x, 0)).filter((x: number) => x > 0).slice(0, 6)
    : DEFAULTS.quickDiscounts
  return {
    enabled: Boolean(raw.enabled),
    currency: 'TND',
    tvaDefault: clampPct(raw.tvaDefault, DEFAULTS.tvaDefault),
    quickDiscounts: quick.length ? quick : DEFAULTS.quickDiscounts,
    paymentMethods: Array.isArray(raw.paymentMethods) && raw.paymentMethods.length
      ? raw.paymentMethods.filter((m: any) => m === 'cash' || m === 'card')
      : DEFAULTS.paymentMethods,
    requirePinForVoid: Boolean(raw.requirePinForVoid),
    requirePinForDiscount: Boolean(raw.requirePinForDiscount),
    requireShift: raw.requireShift === undefined ? DEFAULTS.requireShift : Boolean(raw.requireShift),
    tableMode: Boolean(raw.tableMode),
    ticketHeader: typeof raw.ticketHeader === 'string' ? raw.ticketHeader.slice(0, 200) : DEFAULTS.ticketHeader,
    ticketFooter: typeof raw.ticketFooter === 'string' ? raw.ticketFooter.slice(0, 200) : DEFAULTS.ticketFooter,
    printLogo: raw.printLogo === undefined ? DEFAULTS.printLogo : Boolean(raw.printLogo),
  }
}

/** Is the POS provisioned/active for this business? */
export function isPosLive(business: any): boolean {
  return posConfig(business).enabled
}
