import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/api/rate-limit'

export async function GET(req: NextRequest, context: any) {
  // Extract slug from params
  const { slug } = await context.params

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  const rl = checkRateLimit('leaderboard-get:' + ip)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez dans un instant.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  try {
    const supabase = await createServiceRoleClient()

    // 1. Get the business ID for the slug
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle()

    if (!business) {
      return NextResponse.json({ error: 'Établissement introuvable.' }, { status: 404 })
    }

    // 2. Fetch the leaderboard via RPC
    const { data, error } = await (supabase as any).rpc('get_loyalty_leaderboard', {
      p_business: (business as any).id,
      p_limit: 50
    })

    if (error) {
      console.error('get_loyalty_leaderboard rpc error:', error.message)
      // Check if it's missing the RPC (means user hasn't run the SQL script)
      if (error.code === '42883' || error.message.includes('could not find the function')) {
        return NextResponse.json({ error: 'Classement en cours de configuration. (SQL script missing)' }, { status: 503 })
      }
      return NextResponse.json({ error: 'Erreur lors de la récupération du classement.' }, { status: 500 })
    }

    // 3. Mask phone numbers for privacy if name is missing
    const safeData = (data || []).map((row: any) => {
      let displayName = row.name
      if (!displayName && row.phone) {
        // Mask phone e.g. "21******89"
        const p = row.phone
        displayName = p.length > 4 ? `${p.substring(0, 2)}••••••${p.substring(p.length - 2)}` : 'Anonyme'
      }
      return {
        name: displayName || 'Anonyme',
        age: row.age,
        points: row.points
      }
    })

    return NextResponse.json({ leaderboard: safeData })
  } catch (err: any) {
    console.error('leaderboard API error:', err)
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 })
  }
}
