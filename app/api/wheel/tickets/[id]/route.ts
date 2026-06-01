import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: ticket } = await (supabase
    .from('wheel_tickets') as any)
    .select('business_id, redeemed')
    .eq('id', id)
    .single()

  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  const { data: business } = await (supabase
    .from('businesses') as any)
    .select('id')
    .eq('id', ticket.business_id)
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (ticket.redeemed) {
    return NextResponse.json({ error: 'Ticket already redeemed' }, { status: 400 })
  }

  const { error } = await (supabase
    .from('wheel_tickets') as any)
    .update({ redeemed: true, redeemed_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
