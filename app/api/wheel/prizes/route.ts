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

  const { data: rawExisting } = await (supabase
    .from('wheel_prizes') as any)
    .select('id, stock, stock_remaining')
    .eq('business_id', business.id)

  const existingList: any[] = rawExisting || []
  const existingMap = new Map(existingList.map((r: any) => [r.id, r]))
  const incomingIds = prizes.filter((p: any) => p.id).map((p: any) => p.id)

  const idsToDelete = Array.from(existingMap.keys()).filter((id: any) => !incomingIds.includes(id))
  if (idsToDelete.length > 0) {
    await (supabase.from('wheel_prizes') as any).delete().in('id', idsToDelete)
  }

  for (const prize of prizes) {
    const existing: any = prize.id ? existingMap.get(prize.id) : null
    const stock = prize.stock != null && prize.stock !== '' ? parseInt(prize.stock) || 0 : null

    if (existing) {
      const oldStock = existing.stock != null ? parseInt(existing.stock) : null
      let stock_remaining = existing.stock_remaining != null ? parseInt(existing.stock_remaining) : null

      if (stock !== oldStock) {
        stock_remaining = stock
      }

      await (supabase
        .from('wheel_prizes') as any)
        .update({
          label: prize.label,
          weight: prize.weight,
          is_winning: prize.is_winning,
          stock: stock,
          stock_remaining: stock_remaining,
        })
        .eq('id', prize.id)
    } else {
      await (supabase
        .from('wheel_prizes') as any)
        .insert({
          business_id: business.id,
          label: prize.label,
          weight: prize.weight,
          is_winning: prize.is_winning,
          stock: stock,
          stock_remaining: stock,
        })
    }
  }

  return NextResponse.json({ success: true })
}
