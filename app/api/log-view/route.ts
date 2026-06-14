import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // Fire-and-forget analytics beacon: it must NEVER surface a 5xx to the
  // client (a transient DB blip shouldn't log a console error on the menu).
  try {
    const { slug } = await req.json()

    if (!slug) {
      return NextResponse.json({ error: 'slug required' }, { status: 400 })
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

    // Never trust a client-supplied business_id — resolve it from the slug.
    const { data: biz } = await (supabase.from('businesses') as any)
      .select('id')
      .eq('slug', slug)
      .in('status', ['active', 'paused'])
      .maybeSingle()
    if (!biz) {
      return NextResponse.json({ logged: false }, { status: 200 })
    }

    const { error } = await (supabase.from('menu_views') as any).insert({
      business_id: biz.id,
      device_type: deviceType,
    })

    if (error) {
      console.warn('log-view insert failed (non-fatal):', error.message)
      return NextResponse.json({ logged: false }, { status: 200 })
    }

    const response = NextResponse.json({ logged: true })
    response.cookies.set(cookieName, Date.now().toString(), {
      maxAge: 30 * 60,
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
    })

    return response
  } catch (err: any) {
    console.warn('log-view error (non-fatal):', err?.message)
    return NextResponse.json({ logged: false }, { status: 200 })
  }
}
