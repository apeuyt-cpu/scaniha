import { NextRequest, NextResponse } from 'next/server'
import { PLANS, type PlanId, createDodoCheckoutSession } from '@/lib/dodo-payments'

export async function POST(req: NextRequest) {
  try {
    const { planId, email } = await req.json()

    if (!planId || !PLANS[planId as PlanId]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const plan = PLANS[planId as PlanId]

    if (!plan.productId) {
      return NextResponse.json(
        { error: 'Dodo Payments product not configured. Please set DODO_PRODUCT_ID_' + planId.toUpperCase() + ' env var.' },
        { status: 500 }
      )
    }

    const session = await createDodoCheckoutSession(plan.productId, email)

    return NextResponse.json({ url: session.checkout_url })
  } catch (error: any) {
    console.error('Checkout error:', error.message || error)
    return NextResponse.json({ error: error.message || 'Failed to create checkout session' }, { status: 500 })
  }
}
