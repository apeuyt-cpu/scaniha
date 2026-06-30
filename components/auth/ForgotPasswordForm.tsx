'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const MIN_PASSWORD_LENGTH = 8

type Step = 'email' | 'code' | 'password' | 'done'

export default function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState<string[]>(Array(6).fill(''))
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement | null>(null)
  const passwordRef = useRef<HTMLInputElement | null>(null)
  const codeRefs = useRef<Array<HTMLInputElement | null>>([])

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const joinedCode = code.join('')

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setInterval(() => {
      setResendIn((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendIn])

  const validateEmailLocal = () => {
    const clean = email.trim().toLowerCase()
    if (!clean || !emailRegex.test(clean)) {
      setError('Votre email est incorrect.')
      emailRef.current?.focus()
      return null
    }
    return clean
  }

  const sendCode = async () => {
    const clean = validateEmailLocal()
    if (!clean || loading || resendIn > 0) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/auth/password-reset/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 429 && typeof json.retryAfter === 'number') setResendIn(json.retryAfter)
        setError(json.error || "Impossible d'envoyer le code. Veuillez réessayer.")
        return
      }
      setStep('code')
      setCode(Array(6).fill(''))
      setResendIn(typeof json.retryAfter === 'number' ? json.retryAfter : 60)
      setSuccess('Code envoyé. Vérifiez votre boîte email.')
      window.setTimeout(() => codeRefs.current[0]?.focus(), 50)
    } catch {
      setError('Problème de connexion réseau. Vérifiez votre connexion internet et réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const handleCodeChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6)
    if (!digits) {
      setCode((current) => current.map((char, i) => (i === index ? '' : char)))
      return
    }

    setError(null)
    setCode((current) => {
      const next = [...current]
      digits.split('').forEach((digit, offset) => {
        if (index + offset < next.length) next[index + offset] = digit
      })
      return next
    })

    const nextIndex = Math.min(5, index + digits.length)
    window.setTimeout(() => codeRefs.current[nextIndex]?.focus(), 0)
  }

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(joinedCode)) {
      setError('Veuillez saisir le code de vérification à 6 chiffres.')
      codeRefs.current[0]?.focus()
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/auth/password-reset/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinedCode }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || 'Code de vérification incorrect.')
        codeRefs.current[0]?.focus()
        return
      }
      setStep('password')
      setSuccess('Email vérifié. Choisissez votre nouveau mot de passe.')
      window.setTimeout(() => passwordRef.current?.focus(), 50)
    } catch {
      setError('Problème de connexion réseau. Vérifiez votre connexion internet et réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const completeReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!password) {
      setError('Veuillez saisir votre nouveau mot de passe.')
      passwordRef.current?.focus()
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`)
      passwordRef.current?.focus()
      return
    }
    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/password-reset/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmPassword }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || 'Impossible de modifier le mot de passe. Veuillez réessayer.')
        return
      }
      setStep('done')
      setPassword('')
      setConfirmPassword('')
      setSuccess('Votre mot de passe a été modifié. Vous pouvez vous connecter.')
    } catch {
      setError('Problème de connexion réseau. Vérifiez votre connexion internet et réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const inputBase =
    'w-full rounded-xl border bg-[#FEFEFE] px-4 py-3 text-base text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-transparent focus:ring-2 focus:ring-orange-500'

  return (
    <form className="space-y-5" onSubmit={completeReset} noValidate>
      <div>
        <label htmlFor="reset-email" className="mb-2 block text-sm font-medium text-zinc-700">
          Email
        </label>
        <div className="flex gap-2 sm:gap-3">
          <input
            id="reset-email"
            ref={emailRef}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
              setSuccess(null)
              if (step !== 'email') {
                setStep('email')
                setCode(Array(6).fill(''))
              }
            }}
            className={`${inputBase} ${error && step === 'email' ? 'border-red-400' : 'border-zinc-300'}`}
            placeholder="example@email.com"
            dir="ltr"
            disabled={loading || step === 'password' || step === 'done'}
          />
          {step !== 'password' && step !== 'done' && (
            <button
              type="button"
              onClick={sendCode}
              disabled={loading || resendIn > 0}
              className="shrink-0 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300 sm:px-5"
            >
              {loading && step === 'email' ? 'Envoi...' : resendIn > 0 ? `${resendIn}s` : step === 'code' ? 'Renvoyer' : 'Envoyer le code'}
            </button>
          )}
        </div>
      </div>

      {step === 'code' && (
        <div>
          <label htmlFor="reset-code-0" className="mb-2 block text-sm font-medium text-zinc-700">
            Code de vérification (6 chiffres)
          </label>
          <div className="grid grid-cols-6 gap-2 sm:gap-3" dir="ltr">
            {code.map((digit, index) => (
              <input
                key={index}
                id={`reset-code-${index}`}
                ref={(el) => { codeRefs.current[index] = el }}
                value={digit}
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                aria-label={`Chiffre ${index + 1} du code de vérification`}
                className="aspect-square w-full rounded-xl border border-zinc-300 bg-[#FEFEFE] text-center text-xl font-semibold text-zinc-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-orange-500"
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !code[index] && index > 0) codeRefs.current[index - 1]?.focus()
                }}
                onPaste={(e) => {
                  e.preventDefault()
                  handleCodeChange(index, e.clipboardData.getData('text'))
                }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={verifyCode}
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-orange-600 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Vérification...' : 'Vérifier mon email'}
          </button>
        </div>
      )}

      {step === 'password' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-zinc-700">
              Nouveau mot de passe
            </label>
            <input
              id="new-password"
              ref={passwordRef}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputBase} border-zinc-300`}
              placeholder="••••••••"
            />
            <p className="mt-1.5 text-xs text-zinc-500">Au moins {MIN_PASSWORD_LENGTH} caractères.</p>
          </div>
          <div>
            <label htmlFor="confirm-new-password" className="mb-2 block text-sm font-medium text-zinc-700">
              Confirmer le nouveau mot de passe
            </label>
            <input
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`${inputBase} border-zinc-300`}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-orange-600 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Modification...' : 'Modifier mon mot de passe'}
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-700">
          {success}
        </div>
      )}

      {step === 'done' && (
        <Link
          href="/login"
          className="block w-full rounded-xl bg-orange-600 px-4 py-3 text-center text-base font-medium text-white transition-colors hover:bg-orange-700"
        >
          Retour à la connexion
        </Link>
      )}
    </form>
  )
}

