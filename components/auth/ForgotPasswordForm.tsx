'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Step = 'email' | 'verify' | 'password'

function validateEmailAddress(value: string): { valid: boolean; message?: string } {
  const normalized = value.trim().toLowerCase()

  if (!normalized) {
    return { valid: false, message: 'Veuillez saisir votre adresse email.' }
  }

  if (!emailRegex.test(normalized)) {
    return { valid: false, message: 'L’email est incorrect. Tapez une adresse email valide.' }
  }

  const domain = normalized.split('@')[1]
  const isValidDomain = Boolean(domain) && domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.')
  const domainTld = domain?.split('.').pop()
  const looksLikeMailboxDomain = isValidDomain && Boolean(domainTld) && domainTld.length >= 2

  if (!looksLikeMailboxDomain) {
    return { valid: false, message: 'L’email est incorrect. Tapez une adresse email valide de boîte mail (Gmail, Yahoo, Outlook, etc.).' }
  }

  return { valid: true }
}

export default function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (resendCooldown <= 0) return

    const timer = window.setInterval(() => {
      setResendCooldown((current) => current - 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [resendCooldown])

  const handleSendCode = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    setMessage(null)

    const trimmedEmail = email.trim().toLowerCase()
    const emailValidation = validateEmailAddress(trimmedEmail)

    if (!emailValidation.valid) {
      setEmailError(emailValidation.message ?? 'L’email est incorrect. Tapez une adresse email valide.')
      return
    }

    setEmailError(null)
    setLoading(true)

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })

      if (otpError) {
        console.error('Send OTP error:', otpError)
        const msg = otpError.message || ''
        if (msg.toLowerCase().includes('user not found') || msg.toLowerCase().includes('not found')) {
          setError('Aucun compte ne correspond à cette adresse email.')
        } else {
          setError('Impossible d’envoyer le code pour le moment. Veuillez réessayer.')
        }
        setLoading(false)
        return
      }

      setMessage('Un code de vérification a été envoyé à votre adresse email.')
      setStep('verify')
      setResendCooldown(30)
      setLoading(false)
    } catch (err: any) {
      console.error('Unexpected send OTP error:', err)
      setError('Une erreur inattendue s’est produite. Veuillez réessayer.')
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    const trimmedOtp = otp.trim()
    if (!trimmedOtp) {
      setError('Veuillez saisir le code de vérification.')
      return
    }

    setLoading(true)

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: trimmedOtp,
        type: 'email',
      })

      if (verifyError || !data.session) {
        console.error('Verify OTP error:', verifyError)
        setError('Code invalide ou expiré. Veuillez demander un nouveau code.')
        setLoading(false)
        return
      }

      setMessage('Adresse email vérifiée. Définissez votre nouveau mot de passe.')
      setStep('password')
      setLoading(false)
    } catch (err: any) {
      console.error('Unexpected verify OTP error:', err)
      setError('La vérification a échoué. Veuillez réessayer.')
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    const trimmedPassword = password.trim()
    const trimmedConfirmPassword = confirmPassword.trim()

    if (!trimmedPassword || trimmedPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: trimmedPassword,
      })

      if (updateError) {
        console.error('Update password error:', updateError)
        setError('Impossible de mettre à jour votre mot de passe pour le moment.')
        setLoading(false)
        return
      }

      setMessage('Votre mot de passe a été mis à jour avec succès.')
      setLoading(false)
      window.setTimeout(() => {
        router.push('/login')
      }, 1600)
    } catch (err: any) {
      console.error('Unexpected password update error:', err)
      setError('Une erreur inattendue s’est produite. Veuillez réessayer.')
      setLoading(false)
    }
  }

  const inputBase =
    'w-full rounded-2xl border border-zinc-300 bg-[#FEFEFE] px-4 py-3 text-base text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500'

  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-7 shadow-sm">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">Sécurité</p>
        <h2 className="mt-2 text-2xl font-semibold text-zinc-900">Réinitialiser votre mot de passe</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          {step === 'email' && 'Saisissez votre adresse email pour recevoir un code de vérification.'}
          {step === 'verify' && 'Entrez le code reçu par email pour vérifier votre identité.'}
          {step === 'password' && 'Choisissez un nouveau mot de passe sécurisé.'}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {step === 'email' && (
        <form className="space-y-4" onSubmit={handleSendCode}>
          <div>
            <label htmlFor="forgot-email" className="mb-2 block text-sm font-medium text-zinc-700">
              Adresse email
            </label>
            <input
              id="forgot-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (emailError) setEmailError(null)
                if (error) setError(null)
              }}
              className={inputBase}
              placeholder="example@email.com"
            />
            {emailError && <p className="mt-2 text-sm text-red-600">{emailError}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-2xl bg-orange-600 px-4 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Envoi en cours…' : 'Envoyer le code'}
          </button>
        </form>
      )}

      {step === 'verify' && (
        <form className="space-y-4" onSubmit={handleVerifyCode}>
          <div>
            <label htmlFor="otp-code" className="mb-2 block text-sm font-medium text-zinc-700">
              Code de vérification
            </label>
            <input
              id="otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={inputBase}
              placeholder="123456"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-2xl bg-orange-600 px-4 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Vérification…' : 'Vérifier le code'}
          </button>

          <button
            type="button"
            onClick={() => handleSendCode()}
            disabled={loading || resendCooldown > 0}
            className="w-full text-sm font-medium text-orange-600 transition hover:text-orange-700 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            {resendCooldown > 0 ? `Renvoyer le code (${resendCooldown}s)` : 'Renvoyer le code'}
          </button>
        </form>
      )}

      {step === 'password' && (
        <form className="space-y-4" onSubmit={handlePasswordSubmit}>
          <div>
            <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-zinc-700">
              Nouveau mot de passe
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputBase}
              placeholder="Minimum 8 caractères"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-zinc-700">
              Confirmer le mot de passe
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputBase}
              placeholder="Confirmez votre mot de passe"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-2xl bg-orange-600 px-4 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Enregistrement…' : 'Enregistrer le nouveau mot de passe'}
          </button>
        </form>
      )}

      <div className="mt-6 text-center text-sm text-zinc-500">
        <Link href="/login" className="font-semibold text-orange-600 transition hover:text-orange-700">
          Retour à la connexion
        </Link>
      </div>
    </div>
  )
}
