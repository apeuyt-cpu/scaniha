'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function VerifyResetCodeForm() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; code?: string }>({})
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  const codeRef = useRef<HTMLInputElement | null>(null)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  useEffect(() => {
    const storedEmail = localStorage.getItem('resetEmail')
    if (storedEmail) {
      setEmail(storedEmail)
    }
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timeLeft])

  const handleResend = async () => {
    setResending(true)
    setResendSuccess(false)
    setError(null)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Une erreur est survenue lors du renvoi.')
        setResending(false)
        return
      }

      setResendSuccess(true)
      setTimeLeft(60)
      setTimeout(() => setResendSuccess(false), 3000)
    } catch (err: any) {
      console.error('Error:', err)
      setError('Une erreur inattendue est survenue.')
    } finally {
      setResending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (loading) return

    setError(null)

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedCode = code.trim()

    const errs: { email?: string; code?: string } = {}
    if (!trimmedEmail) {
      errs.email = 'Veuillez saisir votre adresse email.'
    } else if (!emailRegex.test(trimmedEmail)) {
      errs.email = 'Veuillez saisir une adresse email valide.'
    }
    if (!trimmedCode) {
      errs.code = 'Veuillez entrer le code de vérification.'
    } else if (trimmedCode.length !== 6 || !/^\d+$/.test(trimmedCode)) {
      errs.code = 'Le code doit être composé de 6 chiffres.'
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      codeRef.current?.focus()
      return
    }

    setFieldErrors({})
    setLoading(true)

    try {
      const response = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, code: trimmedCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Code invalide. Veuillez réessayer.')
        setLoading(false)
        return
      }

      // Store data for password reset page
      localStorage.setItem('resetEmail', trimmedEmail)
      localStorage.setItem('resetCode', trimmedCode)

      // Redirect to reset password page
      router.push('/reset-password')
    } catch (err: any) {
      console.error('Error:', err)
      setError('Une erreur inattendue est survenue. Veuillez réessayer.')
      setLoading(false)
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
            Adresse email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? 'verify-email-error' : undefined}
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
          {fieldErrors.email && <p id="verify-email-error" className="mt-1.5 text-sm text-red-600">{fieldErrors.email}</p>}
        </div>

        <div>
          <label htmlFor="code" className="block text-sm font-medium text-zinc-700 mb-2">
            Code de vérification
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            ref={codeRef}
            aria-invalid={!!fieldErrors.code}
            aria-describedby={fieldErrors.code ? 'verify-code-error' : undefined}
            className={`${inputBase} text-center text-2xl tracking-widest font-semibold ${fieldErrors.code ? 'border-red-400' : 'border-zinc-300'}`}
            placeholder="000000"
            value={code}
            maxLength={6}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6)
              setCode(val)
              if (fieldErrors.code) setFieldErrors(prev => ({ ...prev, code: undefined }))
            }}
          />
          {fieldErrors.code && <p id="verify-code-error" className="mt-1.5 text-sm text-red-600">{fieldErrors.code}</p>}
          <p className="text-center text-xs text-zinc-500 mt-2">
            Entrez les 6 chiffres du code envoyé à votre email
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" aria-live="assertive" className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      {resendSuccess && (
        <div role="status" className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm text-center">
          Code renvoyé avec succès
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-orange-600 text-white rounded-xl text-base font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Vérification en cours...' : 'Vérifier le code'}
        </button>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-zinc-200">
        <p className="text-sm text-zinc-600">Vous n'avez pas reçu le code&nbsp;?</p>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || timeLeft > 0}
          className="text-sm font-medium text-orange-600 hover:text-orange-700 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors"
        >
          {timeLeft > 0 ? `Renvoyer dans ${timeLeft}s` : resending ? 'Envoi en cours...' : 'Renvoyer'}
        </button>
      </div>
    </form>
  )
}
