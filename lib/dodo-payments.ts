export type PlanId = '6months' | '1year' | 'lifetime'

export interface PlanConfig {
  id: PlanId
  label: string
  price: number
  currency: string
  duration: string
  productId: string
}

export const PLANS: Record<PlanId, PlanConfig> = {
  '6months': {
    id: '6months',
    label: '6 أشهر',
    price: 150,
    currency: 'TND',
    duration: '6months',
    productId: process.env.DODO_PRODUCT_ID_6MONTHS || '',
  },
  '1year': {
    id: '1year',
    label: 'سنة كاملة',
    price: 250,
    currency: 'TND',
    duration: '1year',
    productId: process.env.DODO_PRODUCT_ID_1YEAR || '',
  },
  lifetime: {
    id: 'lifetime',
    label: 'مدى الحياة',
    price: 600,
    currency: 'TND',
    duration: 'lifetime',
    productId: process.env.DODO_PRODUCT_ID_LIFETIME || '',
  },
}

export function getDodoBaseURL(): string {
  return process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode'
    ? 'https://live.dodopayments.com'
    : 'https://test.dodopayments.com'
}

export async function createDodoCheckoutSession(productId: string, email?: string) {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY
  if (!apiKey) {
    throw new Error('DODO_PAYMENTS_API_KEY is not configured')
  }

  const baseURL = getDodoBaseURL()

  const body: Record<string, any> = {
    product_cart: [{ product_id: productId, quantity: 1 }],
    return_url: `${process.env.DODO_PAYMENTS_RETURN_URL || 'http://localhost:3000'}/admin`,
  }

  if (email) {
    body.customer = { email }
  }

  const res = await fetch(`${baseURL}/checkouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Dodo API error (${res.status}): ${errBody}`)
  }

  const data = await res.json()
  return data
}
