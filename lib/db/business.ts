import { createServerClient } from '../supabase/server'
import { createServiceRoleClient } from '../supabase/server'
import type { Database } from '../supabase/database.types'

type Business = Database['public']['Tables']['businesses']['Row']

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const supabase = await createServerClient()
  
  try {
    // Allow both active and paused businesses to load
    // We'll check expiration in the page component
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('slug', slug)
      .in('status', ['active', 'paused'])
      .maybeSingle()
    
    if (error) {
      console.error('Error fetching business by slug:', error)
      return null
    }
    return data
  } catch (error) {
    console.error('Exception fetching business by slug:', error)
    return null
  }
}

export async function getBusinessByOwner(ownerId: string): Promise<Business | null> {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', ownerId)
    .maybeSingle()
  
  if (error) throw error
  return data
}

export async function getBusinessWithCategoriesAndItems(businessId: string) {
  const supabase = await createServerClient()
  
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select(`
      *,
      items (*)
    `)
    .eq('business_id', businessId)
    .order('position', { ascending: true })
  
  if (categoriesError) throw categoriesError
  
  // Sort items by position within each category
  // Supabase doesn't support ordering nested relations, so we sort in JavaScript
  if (categories) {
    (categories as any[]).forEach((category: any) => {
      if (category.items && Array.isArray(category.items)) {
        category.items.sort((a: any, b: any) => {
          // Sort by position first, then by created_at if position is null or equal
          const posA = a.position !== null && a.position !== undefined ? a.position : 999999
          const posB = b.position !== null && b.position !== undefined ? b.position : 999999
          if (posA !== posB) return posA - posB
          // If positions are equal or both null, sort by created_at
          const dateA = new Date(a.created_at || 0).getTime()
          const dateB = new Date(b.created_at || 0).getTime()
          return dateA - dateB
        })
      }
    })
  }
  
  return categories
}

export async function getActiveBusinesses(): Promise<Array<{ slug: string; updated_at: string | null }>> {
  const supabase = await createServerClient()
  const now = new Date().toISOString()
  
  // Get only active businesses that haven't expired
  const { data, error } = await supabase
    .from('businesses')
    .select('slug, updated_at')
    .eq('status', 'active')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('updated_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching active businesses:', error)
    return []
  }
  return (data || []) as Array<{ slug: string; updated_at: string | null }>
}

export async function getAllBusinesses() {
  // Try service role first, fallback to regular client if not available
  let supabase
  try {
    supabase = await createServiceRoleClient()
  } catch {
    // Service role not available, use regular authenticated client
    supabase = await createServerClient()
  }
  
  // Auto-pause any expired businesses when super admin loads the list
  // This keeps the database in sync
  const now = new Date().toISOString()
  await (supabase.from('businesses') as any)
    .update({ status: 'paused' })
    .lt('expires_at', now)
    .eq('status', 'active')
  
  const { data, error } = await supabase
    .from('businesses')
    .select(`
      *,
      profiles!businesses_owner_id_fkey (
        email,
        phone_number
      )
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function updateBusinessStatus(businessId: string, status: 'active' | 'paused') {
  // Try service role first, fallback to regular client if not available
  let supabase
  try {
    supabase = await createServiceRoleClient()
  } catch {
    // Service role not available, use regular authenticated client
    supabase = await createServerClient()
  }
  
  const { data, error } = await (supabase
    .from('businesses') as any)
    .update({ status })
    .eq('id', businessId)
    .select()
    .single()
  
  if (error) throw error
  return data
}
