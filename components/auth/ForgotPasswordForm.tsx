'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { validateEmailDomain, DEFAULT_VALIDATION_CONFIG } from '@/lib/utils/email-domain-validator'
import { AllowedEmailDomainsInfo, EmailValidatorSupport } from './EmailValidatorDisplay'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string }>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [displayEmail, setDisplayEmail] = useState('')
  const router = useRouter()
  const emailRef = useRef<HTMLInputElement | null>(null)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (loading) return

    setError(null)

    const trimmedEmail = email.trim().toLowerCase()

    const errs: { email?: string } = {}
    if (!trimmedEmail) {
      errs.email = 'Veuillez saisir votre adresse email.'
    } else if (!emailRegex.test(trimmedEmail)) {
      errs.email = 'Veuillez saisir une adresse email valide.'
    } else {
      // Validate email domain
      const domainValidation = validateEmailDomain(trimmedEmail, DEFAULT_VALIDATION_CONFIG)
      if (!domainValidation.valid) {
        errs.email = domainValidation.error || 'Ce domaine d\'email n\'est pas accepté.'
      }
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      emailRef.current?.focus()
      return
    }

    setFieldErrors({})
    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Une erreur est survenue. Veuillez réessayer.')
        setLoading(false)
        return
      }

      setSuccess(true)
      setDisplayEmail(trimmedEmail)
      
      // Redirect to verify code page after 2 seconds
      setTimeout(() => {
        router.push('/verify-reset-code')
      }, 2000)
    } catch (err: any) {
      console.error('Error:', err)
      setError('Une erreur inattendue est survenue. Veuillez réessayer.')
      setLoading(false)
    }
  }

  const inputBase =
    'w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-[#FEFEFE] text-zinc-900 placeholder-zinc-400'

  if (success) {
    return (
      <div className="space-y-5">
        <div role="status" className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-green-800">Vérifiez votre email</h3>
              <p className="text-sm text-green-700 mt-1">
                Nous avons envoyé un code de vérification à <span className="font-semibold">{displayEmail}</span>
              </p>
            </div>
          </div>
        </div>
        <p className="text-center text-sm text-zinc-600">
          Redirection en cours...
        </p>
      </div>
    )
  }

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
            Adresse email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            ref={emailRef}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? 'forgot-email-error' : undefined}
            className={`${inputBase} ${fieldErrors.email ? 'border-red-400' : 'border-zinc-300'}`}
            placeholder="example@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }))
            }}
            dir="ltr"
            autoFocus
          />
          {fieldErrors.email && <p id="forgot-email-error" className="mt-1.5 text-sm text-red-600">{fieldErrors.email}</p>}
          {!fieldErrors.email && <AllowedEmailDomainsInfo />}
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
          disabled={loading}
          className="w-full py-3 px-4 bg-orange-600 text-white rounded-xl text-base font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Envoi en cours...' : 'Envoyer le code'}
        </button>
      </div>

      <p className="text-center text-xs text-zinc-500">
        Vous recevrez un code de vérification par email pour réinitialiser votre mot de passe.
      </p>
      
      <EmailValidatorSupport />
    </form>
  )
}
