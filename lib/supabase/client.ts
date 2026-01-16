'use client'

import { createBrowserClient, type CookieOptions } from '@supabase/ssr'
import type { Database } from './database.types'

export function createClient() {
  return createBrowserClient<Database>(
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
    }
  )
}

