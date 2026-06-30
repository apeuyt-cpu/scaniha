'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// Honour a `next` redirect target only when it's an internal path for the user's
// own area (prevents open-redirects / cross-role jumps).
function safeNext(next: string | null, role: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null
  if (role === 'super_admin') return next.startsWith('/super-admin') ? next : null
  return next.startsWith('/admin') ? next : null
}

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastAttemptTime, setLastAttemptTime] = useState<number>(0)
  const [attemptCount, setAttemptCount] = useState<number>(0)
  const [rateLimited, setRateLimited] = useState<boolean>(false)
  const router = useRouter()
  const supabase = createClient()

  const emailRef = useRef<HTMLInputElement | null>(null)
  const passwordRef = useRef<HTMLInputElement | null>(null)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  // Check if user is already authenticated and redirect them
  // Do NOT call signOut() here as it can clear valid sessions that are still loading
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          // User is already authenticated, get their role and redirect
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle() as { data: { role: string } | null }

          const role = profile?.role
          const next = new URLSearchParams(window.location.search).get('next')
          const redirectUrl = safeNext(next, role) || (role === 'super_admin' ? '/super-admin' : '/admin')
          window.location.replace(redirectUrl)
        }
      } catch {
        // Ignore errors - user will stay on login page
      }
    }
    checkExistingSession()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()

    // Prevent multiple submissions
    if (isSubmitting || loading) {
      return
    }

    setError(null)

    // Validate and normalize inputs
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPassword = password.trim()

    const errs: { email?: string; password?: string } = {}
    if (!trimmedEmail) {
      errs.email = 'Veuillez saisir votre adresse email.'
    } else if (!emailRegex.test(trimmedEmail)) {
      errs.email = 'Veuillez saisir une adresse email valide.'
    }
    if (!trimmedPassword) {
      errs.password = 'Veuillez saisir votre mot de passe.'
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      if (errs.email) emailRef.current?.focus()
      else if (errs.password) passwordRef.current?.focus()
      return
    }
    setFieldErrors({})

    // Rate limiting: prevent rapid successive attempts (allow up to 30 attempts)
    const now = Date.now()
    const timeSinceLastAttempt = now - lastAttemptTime

    // Reset rate limit status and attempt count if more than 30 seconds have passed
    if (timeSinceLastAttempt > 30000) {
      setAttemptCount(0)
      setRateLimited(false)
    }

    // If rate limited, don't make the request at all
    if (rateLimited) {
      setError('Trop de tentatives. Veuillez patienter quelques instants avant de réessayer.')
      return
    }

    // Prevent if too many attempts in short time (max 30 attempts per 30 seconds)
    if (attemptCount >= 30 && timeSinceLastAttempt < 30000) {
      setRateLimited(true)
      setError('Trop de tentatives. Veuillez patienter quelques instants avant de réessayer.')
      // Auto-reset after 30 seconds
      setTimeout(() => {
        setRateLimited(false)
        setAttemptCount(0)
      }, 30000)
      return
    }

    // Only prevent if less than 1 second between attempts
    if (timeSinceLastAttempt < 1000) {
      return // Silently ignore rapid attempts
    }

    setLastAttemptTime(now)
    setAttemptCount(prev => prev + 1)

    setIsSubmitting(true)
    setLoading(true)

    try {
      const { error: authError, data } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      })

      if (authError) {
        // Handle rate limit silently with a clear message (allow up to 30 attempts)
        if (authError.status === 429 || authError.message.includes('rate limit') || authError.message.includes('429') || authError.message.includes('Request rate limit')) {
          setRateLimited(true)
          setAttemptCount(30) // Set to max to prevent more attempts
          setTimeout(() => {
            setRateLimited(false)
            setAttemptCount(0)
          }, 30000)
          setError('Trop de tentatives. Veuillez patienter quelques instants avant de réessayer.')
          setLoading(false)
          setIsSubmitting(false)
          return
        }

        console.error('Login error:', authError)

        const msg = authError.message || ''
        if (msg.includes('Email not confirmed')) {
          setError('Veuillez confirmer votre adresse email avant de vous connecter.')
        } else if (msg.includes('Invalid login credentials') || msg.includes('Invalid login') || authError.status === 400) {
          setError('Email ou mot de passe incorrect.')
        } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
          setError('Problème de connexion réseau. Vérifiez votre connexion internet et réessayez.')
        } else {
          setError('Une erreur est survenue lors de la connexion. Veuillez réessayer.')
        }
        setLoading(false)
        setIsSubmitting(false)
        return
      }

      if (!data?.user) {
        setError('Échec de la connexion. Veuillez réessayer.')
        setLoading(false)
        setIsSubmitting(false)
        return
      }

      // Get user profile to determine correct redirect URL
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', data.user.id)
        .maybeSingle() as { data: { role: string } | null }

      const role = profile?.role
      const next = new URLSearchParams(window.location.search).get('next')
      const redirectUrl = safeNext(next, role) || (role === 'super_admin' ? '/super-admin' : '/admin')

      // Use router.push for client-side navigation - cookies are already set by Supabase SSR
      router.push(redirectUrl)
      router.refresh()
    } catch (err: any) {
      console.error('[LoginForm] Unexpected error:', err)
      const msg = (err?.message || '').toLowerCase()
      if (msg.includes('network') || msg.includes('fetch')) {
        setError('Problème de connexion réseau. Vérifiez votre connexion internet et réessayez.')
      } else {
        setError('Une erreur inattendue est survenue. Veuillez réessayer.')
      }
      setLoading(false)
      setIsSubmitting(false)
    }
  }

  const inputBase =
    'w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-[#FEFEFE] text-zinc-900 placeholder-zinc-400'

  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit}
      method="post"
      dir="ltr"
      noValidate
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-2">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            required
            ref={emailRef}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
            className={`${inputBase} ${fieldErrors.email ? 'border-red-400' : 'border-zinc-300'}`}
            placeholder="example@email.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined })) }}
            dir="ltr"
            autoFocus
          />
          {fieldErrors.email && <p id="login-email-error" className="mt-1.5 text-sm text-red-600">{fieldErrors.email}</p>}
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
              Mot de passe
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              Mot de passe oublié&nbsp;?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            ref={passwordRef}
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
            className={`${inputBase} ${fieldErrors.password ? 'border-red-400' : 'border-zinc-300'}`}
            placeholder="••••••••"
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined })) }}
          />
          {fieldErrors.password && <p id="login-password-error" className="mt-1.5 text-sm text-red-600">{fieldErrors.password}</p>}
        </div>
      </div>

      {error && (
        <div role="alert" aria-live="assertive" className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={loading || isSubmitting}
          className="w-full py-3 px-4 bg-orange-600 text-white rounded-xl text-base font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Connexion en cours...' : 'Se connecter'}
        </button>
      </div>
    </form>
  )
}
