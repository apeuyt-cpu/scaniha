import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { business_id, slug } = await req.json()

  if (!business_id || !slug) {
    return NextResponse.json({ error: 'business_id and slug required' }, { status: 400 })
  }

  const cookieName = `viewed_${slug}`
  const lastView = req.cookies.get(cookieName)?.value

  if (lastView) {
    const elapsed = Date.now() - parseInt(lastView)
    if (elapsed < 30 * 60 * 1000) {
      return NextResponse.json({ skipped: true, reason: 'debounce' })
    }
  }

  const ua = req.headers.get('user-agent') || ''
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(ua)
  const deviceType = isMobile ? 'mobile' : 'desktop'

  const supabase = await createServiceRoleClient()
  const { error } = await (supabase.from('menu_views') as any).insert({
    business_id,
    device_type: deviceType,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const response = NextResponse.json({ logged: true })
  response.cookies.set(cookieName, Date.now().toString(), {
    maxAge: 30 * 60,
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
  })

  return response
}
