import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

function generateTicketCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `SC-${part1}-${part2}`
}

export async function POST(req: NextRequest) {
  const { business_id } = await req.json()

  if (!business_id) {
    return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
  }

  const supabase = await createServerClient()

  const { data: business } = await (supabase
    .from('businesses') as any)
    .select('wheel_enabled, wheel_visible')
    .eq('id', business_id)
    .single()

  if (!business || !business.wheel_enabled || !business.wheel_visible) {
    return NextResponse.json({ error: 'Wheel not available' }, { status: 404 })
  }

  const { data: prizes } = await (supabase
    .from('wheel_prizes') as any)
    .select('*')
    .eq('business_id', business_id)

  if (!prizes || prizes.length === 0) {
    return NextResponse.json({ error: 'No prizes configured' }, { status: 404 })
  }

  const totalWeight = prizes.reduce((sum: number, p: any) => sum + p.weight, 0)
  let random = Math.random() * totalWeight
  let selectedPrize = prizes[0]

  for (const prize of prizes) {
    random -= prize.weight
    if (random <= 0) {
      selectedPrize = prize
      break
    }
  }

  const prizeIndex = prizes.indexOf(selectedPrize)
  const won = selectedPrize.is_winning

  let ticket = null
  if (won) {
    const ticketCode = generateTicketCode()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

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
        code: newTicket.ticket_code,
        prize: newTicket.prize_label,
        issued_at: newTicket.issued_at,
        expires_at: newTicket.expires_at,
      }
    }
  }

  return NextResponse.json({
    prizeIndex,
    prize: selectedPrize,
    won,
    ticket,
  })
}
