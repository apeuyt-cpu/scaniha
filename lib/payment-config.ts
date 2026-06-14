// Manual payment configuration.
// Customers pick a plan, choose a method below, send the money, then upload a receipt.

export type PlanId = '6months' | '1year' | 'lifetime'

// The 3 plans shown on the pricing page / cards.
export const PLANS: Record<PlanId, { id: PlanId; label: string; price: number }> = {
  '6months': { id: '6months', label: '6 mois', price: 150 },
  '1year': { id: '1year', label: '1 an', price: 250 },
  lifetime: { id: 'lifetime', label: 'À vie', price: 600 },
}

// All payable variants (used by the API + approval).
// grantsDays = how long approval extends the subscription. `null` = lifetime:
// approval sets the business's expires_at to null (no expiry — a real lifetime,
// not a "9999 days" hack). See app/api/super-admin/payment-requests/[id]/route.ts.
export const PAYMENT_PLANS: Record<string, { label: string; price: number; grantsDays: number | null }> = {
  '6months': { label: '6 mois', price: 150, grantsDays: 182 },
  '1year': { label: '1 an', price: 250, grantsDays: 365 },
  lifetime: { label: 'À vie', price: 600, grantsDays: null },
  // ── Legacy installment variants ──────────────────────────────────
  // No longer offered in the UI, but kept here so any historical pending
  // request that used them still resolves correctly on approval.
  lifetime_split1: { label: 'À vie — 1er versement (1/2)', price: 300, grantsDays: 31 },
  lifetime_split2: { label: 'À vie — 2e versement (2/2)', price: 300, grantsDays: null },
}

// ─── Physical add-ons (QR supports) ──────────────────────────────────
// ⚙️ YOU control this list: edit labels/prices here and everything
// (pricing page, landing, payment modal, totals) updates automatically.

export type AddonId = 'stand_wood' | 'stand_acrylic' | 'stickers'

export interface Addon {
  id: AddonId
  label: string
  price: number
  /** Display unit, e.g. "par table" — stands are one per table. */
  unit: string
  desc: string
  /** Max quantity selectable in one order. */
  max: number
  emoji: string
}

export const ADDONS: Addon[] = [
  {
    id: 'stand_wood',
    label: 'Support en bois',
    price: 25,
    unit: 'par table',
    desc: 'Support de table en bois gravé — 2 QR codes (menu + Wi-Fi), un par table.',
    max: 100,
    emoji: '🪵',
  },
  {
    id: 'stand_acrylic',
    label: 'Chevalet acrylique',
    price: 15,
    unit: 'par table',
    desc: 'Chevalet transparent élégant — 2 QR codes (menu + Wi-Fi), un par table.',
    max: 100,
    emoji: '💎',
  },
  {
    id: 'stickers',
    label: 'Pack 10 stickers QR',
    price: 10,
    unit: 'le pack',
    desc: 'Stickers résistants à l’eau pour tables, vitrine et comptoir.',
    max: 20,
    emoji: '✨',
  },
]

export function addonById(id: string): Addon | undefined {
  return ADDONS.find((a) => a.id === id)
}

/** Total for a selection like { stand_wood: 8, stickers: 1 }. */
export function addonsTotal(selection: Partial<Record<AddonId, number>>): number {
  return ADDONS.reduce((sum, a) => sum + a.price * Math.max(0, Math.min(a.max, selection[a.id] || 0)), 0)
}

export type PaymentMethodId = 'd17' | 'rib' | 'flouci'

export interface PaymentMethod {
  id: PaymentMethodId
  label: string
  instructions: string
  /** The account/number the customer sends the money to. EDIT THESE with your real details. */
  details: string
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'd17',
    label: 'D17',
    instructions: 'Envoyez le montant via l’application D17 au numéro ci-dessous, puis joignez le reçu.',
    details: 'D17 : 58415520',
  },
  {
    id: 'rib',
    label: 'Virement (RIB)',
    instructions: 'Effectuez un virement bancaire vers le RIB ci-dessous, puis joignez le reçu.',
    details: 'RIB : 2600 3000 8902 1314 8653',
  },
  {
    id: 'flouci',
    label: 'Flouci',
    instructions: 'Envoyez le montant via Flouci au numéro ci-dessous, puis joignez le reçu.',
    details: 'Flouci : 58415520',
  },
]

export const MAX_RECEIPTS = 5
