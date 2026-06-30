'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ResetPasswordForm() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; passwordConfirm?: string }>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const passwordRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const storedEmail = localStorage.getItem('resetEmail')
    const storedCode = localStorage.getItem('resetCode')

    if (!storedEmail || !storedCode) {
      router.push('/forgot-password')
      return
    }

    setEmail(storedEmail)
    setCode(storedCode)
  }, [router])

  const validatePassword = (pwd: string): string[] => {
    const errors = []
    if (pwd.length < 8) errors.push('Au moins 8 caractères')
    if (!/[A-Z]/.test(pwd)) errors.push('Au moins une lettre majuscule')
    if (!/[a-z]/.test(pwd)) errors.push('Au moins une lettre minuscule')
    if (!/[0-9]/.test(pwd)) errors.push('Au moins un chiffre')
    if (!/[!@#$%^&*]/.test(pwd)) errors.push('Au moins un caractère spécial (!@#$%^&*)')
    return errors
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (loading) return

    setError(null)

    const trimmedPassword = password.trim()
    const trimmedPasswordConfirm = passwordConfirm.trim()

    const errs: { password?: string; passwordConfirm?: string } = {}

    const passwordErrors = validatePassword(trimmedPassword)
    if (passwordErrors.length > 0) {
      errs.password = `Le mot de passe doit contenir: ${passwordErrors.join(', ')}`
    }

    if (trimmedPassword !== trimmedPasswordConfirm) {
      errs.passwordConfirm = 'Les mots de passe ne correspondent pas.'
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      passwordRef.current?.focus()
      return
    }

    setFieldErrors({})
    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code,
          password: trimmedPassword,
          passwordConfirm: trimmedPasswordConfirm,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Une erreur est survenue. Veuillez réessayer.')
        setLoading(false)
        return
      }

      setSuccess(true)
      localStorage.removeItem('resetEmail')
      localStorage.removeItem('resetCode')

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login')
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
              <h3 className="text-sm font-medium text-green-800">Mot de passe réinitialisé</h3>
              <p className="text-sm text-green-700 mt-1">
                Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
              </p>
            </div>
          </div>
        </div>
        <p className="text-center text-sm text-zinc-600">
          Redirection vers la connexion...
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
          <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-2">
            Nouveau mot de passe
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              ref={passwordRef}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'reset-password-error' : undefined}
              className={`${inputBase} pr-12 ${fieldErrors.password ? 'border-red-400' : 'border-zinc-300'}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }))
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-900"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" fillRule="evenodd" />
                  <path d="M15.171 13.576l1.414 1.414a10.015 10.015 0 01-16.34-3.24 9.983 9.983 0 011.441-1.741l1.414 1.414a7.971 7.971 0 001.571 1.914 8 8 0 0011.9 0z" clipRule="evenodd" fillRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          {fieldErrors.password && <p id="reset-password-error" className="mt-1.5 text-sm text-red-600">{fieldErrors.password}</p>}
          <div className="mt-3 space-y-1 text-xs text-zinc-600">
            <p className="font-medium">Le mot de passe doit contenir:</p>
            <ul className="list-disc list-inside space-y-1">
              <li className={password.length >= 8 ? 'text-green-600' : ''}>Au moins 8 caractères</li>
              <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>Une lettre majuscule</li>
              <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>Une lettre minuscule</li>
              <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>Un chiffre</li>
              <li className={/[!@#$%^&*]/.test(password) ? 'text-green-600' : ''}>Un caractère spécial (!@#$%^&*)</li>
            </ul>
          </div>
        </div>

        <div>
          <label htmlFor="passwordConfirm" className="block text-sm font-medium text-zinc-700 mb-2">
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type={showPasswordConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              required
              aria-invalid={!!fieldErrors.passwordConfirm}
              aria-describedby={fieldErrors.passwordConfirm ? 'reset-password-confirm-error' : undefined}
              className={`${inputBase} pr-12 ${fieldErrors.passwordConfirm ? 'border-red-400' : 'border-zinc-300'}`}
              placeholder="••••••••"
              value={passwordConfirm}
              onChange={(e) => {
                setPasswordConfirm(e.target.value)
                if (fieldErrors.passwordConfirm) setFieldErrors(prev => ({ ...prev, passwordConfirm: undefined }))
              }}
            />
            <button
              type="button"
              onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-900"
              aria-label={showPasswordConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPasswordConfirm ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" fillRule="evenodd" />
                  <path d="M15.171 13.576l1.414 1.414a10.015 10.015 0 01-16.34-3.24 9.983 9.983 0 011.441-1.741l1.414 1.414a7.971 7.971 0 001.571 1.914 8 8 0 0011.9 0z" clipRule="evenodd" fillRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          {fieldErrors.passwordConfirm && <p id="reset-password-confirm-error" className="mt-1.5 text-sm text-red-600">{fieldErrors.passwordConfirm}</p>}
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
          disabled={loading || !password || !passwordConfirm}
          className="w-full py-3 px-4 bg-orange-600 text-white rounded-xl text-base font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Enregistrement en cours...' : 'Enregistrer le mot de passe'}
        </button>
      </div>
    </form>
  )
}
