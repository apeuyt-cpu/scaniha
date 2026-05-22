import DodoPayments from 'dodopayments'

export type PlanId = '6months' | '1year' | 'lifetime'

export interface PlanConfig {
  id: PlanId
  label: string
  price: number
  currency: string
  duration: string
  productId: string
  isSubscription: boolean
}

export const PLANS: Record<PlanId, PlanConfig> = {
  '6months': {
    id: '6months',
    label: '6 أشهر',
    price: 150,
    currency: 'TND',
    duration: '6months',
    productId: process.env.DODO_PRODUCT_ID_6MONTHS || '',
    isSubscription: true,
  },
  '1year': {
    id: '1year',
    label: 'سنة كاملة',
    price: 250,
    currency: 'TND',
    duration: '1year',
    productId: process.env.DODO_PRODUCT_ID_1YEAR || '',
    isSubscription: true,
  },
  lifetime: {
    id: 'lifetime',
    label: 'مدى الحياة',
    price: 600,
    currency: 'TND',
    duration: 'lifetime',
    productId: process.env.DODO_PRODUCT_ID_LIFETIME || '',
    isSubscription: false,
  },
}

export function getDodoClient() {
  return new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY || '',
    environment: (process.env.DODO_PAYMENTS_ENVIRONMENT as 'test_mode' | 'live_mode') || 'test_mode',
  })
}

export function getReturnUrl(path?: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return path ? `${base}${path}` : base
}
