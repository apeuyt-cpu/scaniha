import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'

function generateTicketCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `SC-${part1}-${part2}`
}

async function getWheelClient() {
  try {
    return await createServiceRoleClient()
  } catch {
    return await createServerClient()
  }
}

export async function POST(req: NextRequest) {
  let body: { business_id?: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const business_id = body.business_id

  if (!business_id) {
    return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
  }

  const supabase = await getWheelClient()

  const { data: business, error: businessError } = await (supabase
    .from('businesses') as any)
    .select('id, wheel_enabled, wheel_visible, status, expires_at')
    .eq('id', business_id)
    .single()

  if (businessError || !business || !business.wheel_enabled || !business.wheel_visible) {
    return NextResponse.json({ error: 'Wheel not available' }, { status: 404 })
  }

  if (business.status !== 'active') {
    return NextResponse.json({ error: 'Wheel is paused' }, { status: 403 })
  }

  if (business.expires_at && new Date(business.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Wheel is no longer active' }, { status: 403 })
  }

  const { data: prizes, error: prizesError } = await (supabase
    .from('wheel_prizes') as any)
    .select('*')
    .eq('business_id', business_id)
    .order('created_at', { ascending: true })

  if (prizesError) {
    return NextResponse.json({ error: 'Failed to load prizes' }, { status: 500 })
  }

  const playablePrizes = (prizes || []).filter((prize: any) => Number(prize.weight) > 0)

  if (playablePrizes.length === 0) {
    return NextResponse.json({ error: 'No prizes configured' }, { status: 404 })
  }

  const totalWeight = playablePrizes.reduce((sum: number, p: any) => sum + Number(p.weight || 0), 0)
  if (totalWeight <= 0) {
    return NextResponse.json({ error: 'No playable prizes configured' }, { status: 400 })
  }

  let random = Math.random() * totalWeight
  let selectedPrize = playablePrizes[playablePrizes.length - 1]

  for (const prize of playablePrizes) {
    random -= Number(prize.weight || 0)
    if (random <= 0) {
      selectedPrize = prize
      break
    }
  }

  const prizeIndex = (prizes || []).findIndex((prize: any) => prize.id === selectedPrize.id)
  const won = selectedPrize.is_winning

  let ticket = null
  if (won) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    let lastTicketError = null

    for (let attempt = 0; attempt < 5; attempt++) {
      const ticketCode = generateTicketCode()
      const { data: newTicket, error } = await (supabase
        .from('wheel_tickets') as any)
        .insert({
          business_id,
          prize_label: selectedPrize.label,
          ticket_code: ticketCode,
          expires_at: expiresAt,
        })
        .select()
        .single()

      if (!error && newTicket) {
        ticket = {
          id: newTicket.id,
          code: newTicket.ticket_code,
          prize: newTicket.prize_label,
          issued_at: newTicket.issued_at,
          expires_at: newTicket.expires_at,
        }
        break
      }

      lastTicketError = error
      if (error?.code !== '23505') {
        break
      }
    }

    if (!ticket) {
      console.error('[wheel/spin] Failed to create winning ticket', lastTicketError)
      return NextResponse.json(
        { error: 'Prize selected, but ticket creation failed. Please try again.' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({
    prizeIndex,
    prize: selectedPrize,
    won,
    ticket,
  })
}
