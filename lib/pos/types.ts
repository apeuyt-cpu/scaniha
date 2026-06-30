// Scaniha POS — shared domain types (separate product).

export type SaleStatus = 'open' | 'billing' | 'paid' | 'voided' | 'refunded'
export type PaymentMethod = 'cash' | 'card' | 'other'
export type StaffRole = 'cashier' | 'manager' | 'owner'

export interface PosProduct {
  id: string
  category: string | null
  name: string
  price: number
  tax_rate: number
  color: string | null
  image_url: string | null
  available: boolean
  sort: number
}

export interface SaleModifier {
  label: string
  priceDelta: number
}

export interface SaleLine {
  id: string
  product_id: string | null
  name: string
  unit_price: number
  qty: number
  tax_rate: number
  modifiers: SaleModifier[]
  line_total: number
}

export interface Sale {
  id: string
  status: SaleStatus
  table_label: string | null
  server_label: string | null
  subtotal: number
  discount_kind: 'pct' | 'amount' | null
  discount_value: number
  discount_total: number
  tax_total: number
  total: number
  created_at: string
  items: SaleLine[]
}

export interface PaymentInput {
  method: PaymentMethod
  amount: number
  tendered?: number
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  card: 'Carte',
  other: 'Autre',
}

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  cashier: 'Caissier',
  manager: 'Manager',
  owner: 'Propriétaire',
}

/** Format a TND amount with 3 decimals (millimes), French style. */
export function fmtTnd(n: number): string {
  const v = Number.isFinite(n) ? n : 0
  return v.toFixed(3).replace('.', ',') + ' TND'
}
