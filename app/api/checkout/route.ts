import { NextRequest, NextResponse } from 'next/server'
import { getDodoClient, PLANS, type PlanId } from '@/lib/dodo-payments'

export async function POST(req: NextRequest) {
  try {
    const { planId } = await req.json()

    if (!planId || !PLANS[planId as PlanId]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const plan = PLANS[planId as PlanId]
    const client = getDodoClient()

    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: plan.productId, quantity: 1 }],
      return_url: `${process.env.DODO_PAYMENTS_RETURN_URL}/admin`,
    })

    return NextResponse.json({ url: session.checkout_url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
