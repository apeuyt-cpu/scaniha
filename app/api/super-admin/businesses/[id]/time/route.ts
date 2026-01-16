import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient, createServerClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()
    
    const { minutes, days } = await request.json()
    
    // Get supabase client
    let supabase
    try {
      supabase = await createServiceRoleClient()
    } catch {
      supabase = await createServerClient()
    }
    
    let expires_at: string | null = null
    let newStatus: 'active' | 'paused' = 'active'
    
    // Support both 'minutes' and 'days' for backward compatibility
    let totalMinutes: number | null = null
    
    if (minutes !== undefined) {
      totalMinutes = minutes
    } else if (days !== undefined) {
      // Legacy support: convert days to minutes
      totalMinutes = days === -1 ? -1 : days === null ? null : days * 24 * 60
    }
    
    if (totalMinutes === -1 || totalMinutes === 0) {
      // Pause immediately
      expires_at = null
      newStatus = 'paused'
    } else if (totalMinutes === null) {
      // Remove expiration (unlimited)
      expires_at = null
      newStatus = 'active'
    } else if (totalMinutes > 0) {
      // Set expiration date
      const expirationDate = new Date()
      expirationDate.setMinutes(expirationDate.getMinutes() + totalMinutes)
      expires_at = expirationDate.toISOString()
      newStatus = 'active'
    }
    
    const { data, error } = await (supabase
      .from('businesses') as any)
      .update({ 
        expires_at,
        status: newStatus 
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: 401 }
    )
  }
}
