import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function createServerClient() {
  const cookieStore = await cookies()

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

let _publicClient: SupabaseClient<Database> | null = null

/**
 * Cookieless, anon-key Supabase client for PUBLIC reads (menus, sitemap, etc.).
 *
 * Because it never touches cookies, its calls are safe to run inside
 * `unstable_cache` and the results can be cached + shared across every visitor
 * — which is what keeps the public menu off the database on repeat scans. Core
 * tables (businesses / categories / items) have no RLS, so the anon key reads
 * them fine. Memoized as a process-wide singleton.
 */
export async function createPublicClient(): Promise<SupabaseClient<Database>> {
  if (_publicClient) return _publicClient
  const { createClient } = await import('@supabase/supabase-js')
  _publicClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
  return _publicClient
}

export async function createServiceRoleClient(): Promise<SupabaseClient<Database>> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  
  // Use dynamic import to avoid webpack bundling issues
  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
  return client
}

