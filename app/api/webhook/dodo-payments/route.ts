import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const event = body.type || body.event

    if (event === 'payment.succeeded' || event === 'subscription.created') {
      const customerEmail = body.data?.customer?.email || body.customer?.email
      const planId = body.data?.plan_id || body.plan_id

      if (customerEmail && planId) {
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
            .select('id')
            .eq('owner_id', profile.user_id)
            .limit(1)

          const business = (businesses as unknown as { id: string }[] | null)?.[0]

          if (business) {
            let durationDays = 180

            if (planId === process.env.DODO_PRODUCT_ID_1YEAR) {
              durationDays = 365
            } else if (planId === process.env.DODO_PRODUCT_ID_LIFETIME) {
              durationDays = 36500
            }

            const endsAt = new Date()
            endsAt.setDate(endsAt.getDate() + durationDays)

            await supabase
              .from('businesses')
              .update({ expires_at: endsAt.toISOString(), status: 'active' })
              .eq('id', business.id)
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
