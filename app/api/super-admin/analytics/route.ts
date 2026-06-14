import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireSuperAdmin()
  } catch (e: any) {
    if (e?.digest?.startsWith?.('NEXT_REDIRECT') || e?.message === 'NEXT_REDIRECT') throw e
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const supabase = await createServiceRoleClient()

  const { data, error } = await (supabase as any).rpc('get_menu_view_stats')

  if (error) {
    const { data: fallback, error: fallbackError } = await supabase
      .from('businesses')
      .select(`
        id, name, slug,
        menu_views ( viewed_at )
      `)
      .order('name')

    if (fallbackError) {
      console.error('Super-admin analytics fallback error:', fallbackError)
      return NextResponse.json({ error: 'Échec du chargement des statistiques.' }, { status: 500 })
    }

    const stats = (fallback || []).map((b: any) => {
      const views = b.menu_views || []
      const now = new Date()
      const today = views.filter((v: any) => new Date(v.viewed_at) >= new Date(now.getTime() - 86400000)).length
      const week = views.filter((v: any) => new Date(v.viewed_at) >= new Date(now.getTime() - 7 * 86400000)).length
      const month = views.filter((v: any) => new Date(v.viewed_at) >= new Date(now.getTime() - 30 * 86400000)).length
      return { name: b.name, slug: b.slug, today, week, month, total: views.length }
    })

    stats.sort((a: any, b: any) => b.month - a.month)
    return NextResponse.json(stats)
  }

  return NextResponse.json(data || [])
}
