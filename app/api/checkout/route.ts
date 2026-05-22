import { NextRequest, NextResponse } from 'next/server'
import { PLANS, type PlanId } from '@/lib/dodo-payments'

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

    const apiKey = process.env.DODO_PAYMENTS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'DODO_PAYMENTS_API_KEY is not set in environment variables' }, { status: 500 })
    }

    const env = process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode' ? 'live_mode' : 'test_mode'
    const baseURL = env === 'live_mode' ? 'https://live.dodopayments.com' : 'https://test.dodopayments.com'

    const body: Record<string, any> = {
      product_cart: [{ product_id: plan.productId, quantity: 1 }],
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
      console.error('Dodo API error:', res.status, errBody)
      return NextResponse.json(
        { error: `Dodo API error (${res.status}): ${errBody}`, details: { status: res.status, body: errBody, env, keyPrefix: apiKey.substring(0, 8) + '...' } },
        { status: 500 }
      )
    }

    const data = await res.json()
    return NextResponse.json({ url: data.checkout_url })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create checkout session' }, { status: 500 })
  }
}
