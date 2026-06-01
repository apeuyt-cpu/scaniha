import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
  }

  const supabase = await createServerClient()
  const { data: business } = await (supabase
    .from('businesses') as any)
    .select('wheel_enabled, wheel_visible')
    .eq('slug', slug)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  return NextResponse.json({
    enabled: business.wheel_enabled === true,
    visible: business.wheel_visible === true,
  })
}
