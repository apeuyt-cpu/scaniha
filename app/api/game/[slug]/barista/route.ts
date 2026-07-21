import { NextRequest, NextResponse } from 'next/server'
import { dinerSession } from '@/lib/db/account'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { 
  handleCreate, 
  handleJoin, 
  handleListPublic, 
  handleStart, 
  handleNextRound, 
  handleEvaluate, 
  handleVoteJustice, 
  handleEndGame 
} from '@/lib/game/barista-controller'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = await req.json().catch(() => ({}))
  const { action, token, room_code, session_id, round_number, answers, theme, current_round, target_phone } = body

  // Enforce secure session validation globally
  const session = await dinerSession(token || null)
  if (!session.ok) {
    return NextResponse.json({ success: false, error: 'Connectez-vous pour jouer.' }, { status: 401 })
  }

  const phone = session.phone
  const name = session.name || phone
  const age = session.age || null

  const sb: any = await createServiceRoleClient()

  // Validate business
  const { data: biz } = await sb.from('businesses').select('id').eq('slug', slug).maybeSingle()
  if (!biz) {
    return NextResponse.json({ success: false, error: 'Etablissement introuvable.' }, { status: 404 })
  }

  // --- CONTROLLER ROUTING ---
  let result: any = { success: false, error: 'Action inconnue.', status: 400 }

  try {
    switch (action) {
      case 'create':
        result = await handleCreate(sb, biz, phone, name, age, body.is_public)
        break
      case 'join':
        result = await handleJoin(sb, biz, phone, name, age, room_code)
        break
      case 'list_public':
        result = await handleListPublic(sb, biz)
        break
      case 'get_categories':
        const { data: cats } = await sb.from('custom_game_questions')
          .select('category')
          .eq('business_id', biz.id)
        if (cats) {
          const uniqueCats = Array.from(new Set(cats.map((c: any) => c.category).filter(Boolean)))
          result = { success: true, categories: uniqueCats }
        } else {
          result = { success: true, categories: [] }
        }
        break
      case 'start':
        result = await handleStart(sb, session_id, phone, theme)
        break
      case 'next_round':
        result = await handleNextRound(sb, session_id, phone, current_round)
        break
      case 'evaluate':
        result = await handleEvaluate(sb, session_id, phone, round_number, answers)
        break
      case 'vote_justice':
        result = await handleVoteJustice(sb, session_id, phone, target_phone, round_number)
        break
      case 'submit':
        result = { success: true, status: 200 } // Handled asynchronously now
        break
      case 'end':
        result = await handleEndGame(sb, biz, session_id, phone)
        break
    }
  } catch (error: any) {
    console.error(`API Error [${action}]:`, error)
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur.' }, { status: 500 })
  }

  const { status, ...payload } = result
  return NextResponse.json(payload, { status: status || 200 })
}
