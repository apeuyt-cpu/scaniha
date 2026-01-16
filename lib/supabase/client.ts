'use client'

import { createBrowserClient, type CookieOptions } from '@supabase/ssr'
import type { Database } from './database.types'

export function createClient() {
  const client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return document.cookie.split(';').map(cookie => {
            const [name, ...rest] = cookie.split('=')
            return { name: name.trim(), value: rest.join('=') }
          })
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieString = [
              `${name}=${value}`,
              options?.path ? `path=${options.path}` : 'path=/',
              options?.maxAge ? `max-age=${options.maxAge}` : '',
              options?.domain ? `domain=${options.domain}` : '',
              options?.sameSite ? `samesite=${options.sameSite}` : '',
              options?.secure ? 'secure' : '',
            ]
              .filter(Boolean)
              .join('; ')
            document.cookie = cookieString
          })
        },
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        // Handle refresh token errors gracefully
        storage: typeof window !== 'undefined' ? {
          getItem: (key: string) => {
            try {
              return localStorage.getItem(key)
            } catch {
              return null
            }
          },
          setItem: (key: string, value: string) => {
            try {
              localStorage.setItem(key, value)
            } catch {
              // Ignore storage errors
            }
          },
          removeItem: (key: string) => {
            try {
              localStorage.removeItem(key)
            } catch {
              // Ignore storage errors
            }
          },
        } : undefined,
      },
    }
  )

  // Handle auth state changes to clear invalid tokens
  if (typeof window !== 'undefined') {
    client.auth.onAuthStateChange(async (event, session) => {
      // Handle invalid refresh token errors
      if (event === 'TOKEN_REFRESHED' && !session) {
        // Clear invalid session
        try {
          await client.auth.signOut()
        } catch {
          // Ignore errors
        }
      }
      
      // Handle sign out - clear all auth data
      if (event === 'SIGNED_OUT') {
        // Clear all auth-related cookies and storage
        try {
          // Clear cookies
          document.cookie.split(';').forEach(cookie => {
            const name = cookie.split('=')[0].trim()
            if (name.includes('supabase') || name.includes('auth') || name.includes('sb-')) {
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
            }
          })
          // Clear localStorage auth items
          Object.keys(localStorage).forEach(key => {
            if (key.includes('supabase') || key.includes('auth') || key.includes('sb-')) {
              localStorage.removeItem(key)
            }
          })
          // Clear sessionStorage auth items
          Object.keys(sessionStorage).forEach(key => {
            if (key.includes('supabase') || key.includes('auth') || key.includes('sb-')) {
              sessionStorage.removeItem(key)
            }
          })
        } catch {
          // Ignore errors
        }
      }
    })
  }

  return client
}

