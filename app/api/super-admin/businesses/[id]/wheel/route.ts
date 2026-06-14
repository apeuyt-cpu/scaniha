import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await requireSuperAdmin()
  } catch (e: any) {
    if (e?.digest?.startsWith?.('NEXT_REDIRECT') || e?.message === 'NEXT_REDIRECT') throw e
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const { wheel_enabled } = await req.json()

  const supabase = await createServiceRoleClient()
  const { error } = await (supabase
    .from('businesses') as any)
    .update({ wheel_enabled: wheel_enabled === true })
    .eq('id', id)

  if (error) {
    console.error('Wheel toggle DB error:', error)
    return NextResponse.json({ error: 'Échec de la mise à jour de la roue.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
