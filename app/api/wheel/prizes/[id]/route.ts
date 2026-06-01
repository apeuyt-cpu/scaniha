import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: prize } = await (supabase
    .from('wheel_prizes') as any)
    .select('business_id')
    .eq('id', id)
    .single()

  if (!prize) {
    return NextResponse.json({ error: 'Prize not found' }, { status: 404 })
  }

  const { data: business } = await (supabase
    .from('businesses') as any)
    .select('id')
    .eq('id', prize.business_id)
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await (supabase.from('wheel_prizes') as any).delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
