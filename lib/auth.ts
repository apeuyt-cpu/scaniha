import { createServerClient } from './supabase/server'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/login')
  }
  
  return { user, supabase }
}

export async function requireOwner() {
  try {
    const { user, supabase } = await requireAuth()
    
    const { data: profile, error: profileError } = await (supabase
      .from('profiles') as any)
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (profileError) {
      console.error('Profile fetch error:', profileError)
      redirect('/login')
    }
    
    if (!profile || profile.role !== 'owner') {
      redirect('/login')
    }
    
    return { user, supabase, profile }
  } catch (error) {
    console.error('Error in requireOwner:', error)
    redirect('/login')
  }
}

export async function requireSuperAdmin() {
  const { user, supabase } = await requireAuth()
  
  const { data: profile, error: profileError } = await (supabase
    .from('profiles') as any)
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()
  
  if (profileError || !profile || profile.role !== 'super_admin') {
    redirect('/login')
  }
  
  return { user, supabase, profile }
}

export async function getCurrentUser() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

