// Shared types + labels for the QR table-ordering feature. No payment — the
// order reaches the staff and the customer pays at the table.

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'delivered' | 'rejected'

export const ORDER_STATUSES: OrderStatus[] = ['new', 'preparing', 'ready', 'delivered', 'rejected']

/** Staff-facing label. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new: 'Nouvelle',
  preparing: 'En préparation',
  ready: 'Prête',
  delivered: 'Livrée',
  rejected: 'Refusée',
}

/** Customer-facing status text (what the diner sees). */
export const ORDER_STATUS_CUSTOMER: Record<OrderStatus, string> = {
  new: 'Reçue — en attente de validation',
  preparing: 'En préparation',
  ready: 'Prête — on vous l’apporte',
  delivered: 'Livrée',
  rejected: 'Refusée',
}

export const ORDER_STATUS_TONE: Record<OrderStatus, 'amber' | 'blue' | 'green' | 'zinc' | 'red'> = {
  new: 'amber', preparing: 'blue', ready: 'green', delivered: 'zinc', rejected: 'red',
}

export interface OrderItemInput { itemId: string; qty: number }
export interface OrderLine { id: string; order_id?: string; name: string; price: number; qty: number }
export interface Order {
  id: string
  table_number: string
  status: OrderStatus
  customer_name: string | null
  note: string | null
  total: number
  created_at: string
  items: OrderLine[]
}

/** Status transitions the staff can apply from a given status. */
export function nextStatuses(s: OrderStatus): OrderStatus[] {
  switch (s) {
    case 'new': return ['preparing', 'rejected']
    case 'preparing': return ['ready', 'rejected']
    case 'ready': return ['delivered']
    default: return []
  }
}

/** Whether an order is still in flight (shown prominently to staff + customer). */
export function isOrderActive(s: OrderStatus): boolean {
  return s === 'new' || s === 'preparing' || s === 'ready'
}

/** Clamp + validate a client cart into { itemId, qty }[] (es5-safe, bounded). */
export function sanitizeCart(raw: any): OrderItemInput[] {
  const out: OrderItemInput[] = []
  if (!Array.isArray(raw)) return out
  for (let i = 0; i < raw.length && out.length < 100; i++) {
    const e = raw[i]
    const itemId = e && typeof e.itemId === 'string' ? e.itemId : null
    const qty = Math.max(1, Math.min(99, Math.floor(Number(e && e.qty) || 0)))
    if (itemId && qty > 0) out.push({ itemId, qty })
  }
  return out
}
