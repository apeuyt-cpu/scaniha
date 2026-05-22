import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PLAN_DURATIONS: Record<string, number> = {
  '6months': 180,
  '1year': 365,
  lifetime: 36500,
}

function identifyPlan(productId: string): { label: string; days: number } | null {
  if (productId === process.env.DODO_PRODUCT_ID_6MONTHS) return { label: '6months', days: 180 }
  if (productId === process.env.DODO_PRODUCT_ID_1YEAR) return { label: '1year', days: 365 }
  if (productId === process.env.DODO_PRODUCT_ID_LIFETIME) return { label: 'lifetime', days: 36500 }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const event = body.type || body.event

    if (event === 'payment.succeeded' || event === 'subscription.created') {
      const customerEmail = body.data?.customer?.email || body.customer?.email

      // Get product/cart info from the payment
      let productId = body.data?.plan_id || body.plan_id
      if (!productId && body.data?.product_cart?.[0]) {
        productId = body.data.product_cart[0].product_id
      }
      if (!productId && body.product_cart?.[0]) {
        productId = body.product_cart[0].product_id
      }

      if (customerEmail && productId) {
        const plan = identifyPlan(productId)
        if (!plan) {
          console.error('Unknown product ID:', productId)
          return NextResponse.json({ received: true })
        }

        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('email', customerEmail)
          .limit(1)

        const profile = (profiles as unknown as { user_id: string }[] | null)?.[0]

        if (profile) {
          const { data: businesses } = await supabase
            .from('businesses')
            .select('id, status')
            .eq('owner_id', profile.user_id)
            .limit(1)

          const business = (businesses as unknown as { id: string; status: string }[] | null)?.[0]

          if (business) {
            let expiresAt: string

            if (plan.label === 'lifetime') {
              const farFuture = new Date()
              farFuture.setFullYear(farFuture.getFullYear() + 100)
              expiresAt = farFuture.toISOString()
            } else {
              const endDate = new Date()
              endDate.setDate(endDate.getDate() + plan.days)
              expiresAt = endDate.toISOString()
            }

            await supabase
              .from('businesses')
              .update({ expires_at: expiresAt, status: 'active' })
              .eq('id', business.id)

            console.log(`Business ${business.id} activated: ${plan.label} until ${expiresAt}`)
          } else {
            console.error('No business found for user:', profile.user_id)
          }
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
