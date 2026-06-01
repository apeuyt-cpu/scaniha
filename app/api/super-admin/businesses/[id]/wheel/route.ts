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
    if (e.message === 'NEXT_REDIRECT') throw e
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { wheel_enabled } = await req.json()

  const supabase = await createServiceRoleClient()
  const { error } = await (supabase
    .from('businesses') as any)
    .update({ wheel_enabled: wheel_enabled === true })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
