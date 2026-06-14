import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin()
    
    const { id } = await params
    const { email, phone_number } = await request.json()
    
    if (!email && !phone_number) {
      return NextResponse.json(
        { error: 'Un e-mail ou un numéro de téléphone est requis.' },
        { status: 400 }
      )
    }
    
    const supabase = await createServiceRoleClient()
    
    // First, get the business to find owner_id
    const { data: business, error: businessError } = await (supabase
      .from('businesses') as any)
      .select('owner_id')
      .eq('id', id)
      .single()
    
    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Établissement introuvable.' },
        { status: 404 }
      )
    }
    
    const ownerId = business.owner_id as string
    
    // Check if profile exists
    const { data: existingProfile } = await (supabase
      .from('profiles') as any)
      .select('user_id, email, phone_number')
      .eq('user_id', ownerId)
      .maybeSingle()
    
    if (existingProfile) {
      // Update existing profile
      const updateData: any = {}
      if (email !== undefined) updateData.email = email || null
      if (phone_number !== undefined) updateData.phone_number = phone_number || null
      
      const { error: updateError } = await (supabase
        .from('profiles') as any)
        .update(updateData)
        .eq('user_id', ownerId)
      
      if (updateError) {
        console.error('Update profile DB error:', updateError)
        return NextResponse.json(
          { error: 'Échec de la mise à jour du profil.' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Profil mis à jour.',
        profile: {
          email: email || existingProfile.email,
          phone_number: phone_number || existingProfile.phone_number
        }
      })
    } else {
      // Create new profile
      const { error: insertError } = await (supabase
        .from('profiles') as any)
        .insert({
          user_id: ownerId,
          email: email || null,
          phone_number: phone_number || null,
          role: 'owner',
          created_at: new Date().toISOString()
        })
      
      if (insertError) {
        console.error('Create profile DB error:', insertError)
        return NextResponse.json(
          { error: 'Échec de la création du profil.' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Profil créé.',
        profile: {
          email: email || '',
          phone_number: phone_number || ''
        }
      })
    }
  } catch (error: any) {
    if (error?.digest?.startsWith?.('NEXT_REDIRECT') || error?.message === 'NEXT_REDIRECT') throw error
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Non autorisé.' },
      { status: error?.message?.includes('Unauthorized') ? 401 : 500 }
    )
  }
}

