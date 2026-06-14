import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * A player submits inline-survey answers for a survey gate (before login).
 * Body: { gateId, deviceId, answers: [{ question, answer }] }
 * Stored in game_survey_responses for the owner to read.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = await req.json().catch(() => ({}))
  const gateId = typeof body.gateId === 'string' ? body.gateId.slice(0, 64) : ''
  const deviceId = typeof body.deviceId === 'string' ? body.deviceId.slice(0, 64) : null
  const rawAnswers = Array.isArray(body.answers) ? body.answers : []
  if (!gateId) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })

  const answers = rawAnswers.slice(0, 20).map((a: any) => ({
    question: String(a?.question ?? '').slice(0, 300),
    answer: String(a?.answer ?? '').slice(0, 1000),
  }))

  try {
    const supabase: any = await createServiceRoleClient()
    const { data: business } = await supabase
      .from('businesses').select('id').eq('slug', slug).eq('status', 'active').maybeSingle()
    if (!business) return NextResponse.json({ ok: false, error: 'no_business' }, { status: 404 })

    const { error } = await supabase.from('game_survey_responses').insert({
      business_id: business.id, gate_id: gateId, device_id: deviceId, answers,
    })
    if (error) {
      console.error('survey insert:', error.message)
      return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('survey route:', e?.message)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }
}
