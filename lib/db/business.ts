import { createServerClient } from '../supabase/server'
import { createServiceRoleClient } from '../supabase/server'
import type { Database } from '../supabase/database.types'
import { menuImageUrl } from '../image-url'

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
      return null
    }
    return data
  } catch (error) {
    return null
  }
}

export async function getBusinessByOwner(ownerId: string): Promise<Business | null> {
  const supabase = await createServerClient()
  
  // First verify the user is an owner (not super_admin)
  const { data: profile, error: profileError } = await (supabase
    .from('profiles') as any)
    .select('role')
    .eq('user_id', ownerId)
    .maybeSingle()
  
  if (profileError) {
    throw profileError
  }
  
  // Only allow owners to access their business
  // Super admins should use getAllBusinesses() instead
  if (!profile || profile.role !== 'owner') {
    return null
  }
  
  // Get business owned by this user
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
      // Resize images to display size (huge load-time win — see lib/image-url).
      category.image_url = menuImageUrl(category.image_url, 480)
      if (category.items && Array.isArray(category.items)) {
        category.items.forEach((item: any) => {
          item.image_url = menuImageUrl(item.image_url, 640)
        })
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

export async function getActiveBusinesses(): Promise<Array<{ slug: string; created_at: string | null }>> {
  const supabase = await createServerClient()
  const now = new Date().toISOString()

  // Get only active businesses that haven't expired.
  // NB: the businesses table has no `updated_at` column — use `created_at`
  // (selecting a missing column errors and silently drops every menu from the sitemap).
  const { data, error } = await supabase
    .from('businesses')
    .select('slug, created_at')
    .eq('status', 'active')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })

  if (error) {
    return []
  }
  return (data || []) as Array<{ slug: string; created_at: string | null }>
}

export async function getAllBusinesses() {
  // Try service role first, fallback to regular client if not available.
  let supabase
  try {
    supabase = await createServiceRoleClient()
  } catch (error) {
    // Service role not available, use regular authenticated client.
    supabase = await createServerClient()
  }

  // NOTE: This is a READ-ONLY function. It must NOT mutate the database.
  // Expiry-based auto-pausing used to happen here as a side effect of loading
  // the list — that was moved out so listing never changes state. Display
  // status is computed by callers (expires_at in the past → treat as expired);
  // actual status transitions belong in a dedicated endpoint / cron.

  // Fetch businesses first.
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    // Return empty array instead of throwing to prevent 500 errors.
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  // Fetch all owner profiles in a SINGLE batched query (no N+1 loop).
  const ownerIds = Array.from(new Set(data.map((b: any) => b.owner_id).filter(Boolean)))

  if (ownerIds.length > 0) {
    const profileMap = new Map<string, { email: string | null; phone_number: string | null }>()

    // Prefer the service-role client for profiles (bypasses RLS); fall back otherwise.
    let profileSupabase = supabase
    try {
      profileSupabase = await createServiceRoleClient()
    } catch {
      profileSupabase = supabase
    }

    try {
      const { data: profiles } = await (profileSupabase
        .from('profiles') as any)
        .select('user_id, email, phone_number')
        .in('user_id', ownerIds)

      for (const profile of (profiles || []) as any[]) {
        const email = profile.email ? String(profile.email).trim() : null
        const phone = profile.phone_number ? String(profile.phone_number).trim() : null
        profileMap.set(profile.user_id, { email, phone_number: phone })
      }
    } catch {
      // On failure, businesses simply render without contact info.
    }

    data.forEach((business: any) => {
      const profile = profileMap.get(business.owner_id)
      business.profiles = profile
        ? { email: profile.email ?? null, phone_number: profile.phone_number ?? null }
        : null
    })
  } else {
    data.forEach((business: any) => {
      business.profiles = null
    })
  }

  return data
}

/**
 * Pause all active businesses whose subscription has expired.
 * This MUTATES the database, so it is deliberately kept OUT of the list-read
 * path (see getAllBusinesses). Call it from a dedicated endpoint or a cron job.
 */
export async function pauseExpiredBusinesses(): Promise<number> {
  let supabase
  try {
    supabase = await createServiceRoleClient()
  } catch {
    return 0
  }

  try {
    const now = new Date().toISOString()
    const { data, error } = await (supabase.from('businesses') as any)
      .update({ status: 'paused' })
      .lt('expires_at', now)
      .eq('status', 'active')
      .select('id')

    if (error) return 0
    return (data || []).length
  } catch {
    return 0
  }
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
