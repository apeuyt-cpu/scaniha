import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get('business_id')
  if (!businessId) {
    return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
  }

  const supabase = await createServerClient()
  const { data: prizes, error } = await (supabase
    .from('wheel_prizes') as any)
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(prizes || [])
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await (supabase
    .from('profiles') as any)
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: business } = await (supabase
    .from('businesses') as any)
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  const { prizes } = await req.json()
  if (!Array.isArray(prizes)) {
    return NextResponse.json({ error: 'prizes must be an array' }, { status: 400 })
  }

  const totalWeight = prizes.reduce((sum: number, p: any) => sum + (p.weight || 0), 0)
  if (totalWeight !== 100) {
    return NextResponse.json({ error: 'Total weight must equal 100' }, { status: 400 })
  }

  const { data: existingIds } = await (supabase
    .from('wheel_prizes') as any)
    .select('id')
    .eq('business_id', business.id)

  const existingIdSet = new Set((existingIds || []).map((r: any) => r.id))
  const incomingIds = prizes.filter((p: any) => p.id).map((p: any) => p.id)

  const idsToDelete = Array.from(existingIdSet).filter((id: any) => !incomingIds.includes(id))
  if (idsToDelete.length > 0) {
    await (supabase.from('wheel_prizes') as any).delete().in('id', idsToDelete)
  }

  for (const prize of prizes) {
    if (prize.id && existingIdSet.has(prize.id)) {
      await (supabase
        .from('wheel_prizes') as any)
        .update({ label: prize.label, weight: prize.weight, is_winning: prize.is_winning })
        .eq('id', prize.id)
    } else {
      await (supabase
        .from('wheel_prizes') as any)
        .insert({ business_id: business.id, label: prize.label, weight: prize.weight, is_winning: prize.is_winning })
    }
  }

  return NextResponse.json({ success: true })
}
