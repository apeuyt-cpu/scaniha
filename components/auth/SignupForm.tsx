'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateSlug } from '@/lib/utils/slug'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { PAYMENT_PLANS } from '@/lib/payment-config'
import { seedDemoMenu } from '@/lib/demo-menu-seed'

const MIN_PASSWORD_LENGTH = 8

/** Price label for the selected-plan banner — from the single pricing source. */
function planPriceLabel(plan?: string): string {
  const p = (plan && PAYMENT_PLANS[plan]) || PAYMENT_PLANS['1year']
  return `${p.price} TND`
}

export default function SignupForm({ plan }: { plan?: string }) {
  const { t, dir } = useLocale()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [verificationCode, setVerificationCode] = useState<string[]>(Array(6).fill(''))
  const [codeSent, setCodeSent] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  // Field order drives where focus moves on validation failure (accessibility).
  const fieldOrder = ['email', 'verificationCode', 'password', 'confirmPassword', 'phoneNumber', 'businessName'] as const
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const codeRefs = useRef<Array<HTMLInputElement | null>>([])

  const focusFirstError = (errs: Record<string, string>) => {
    const first = fieldOrder.find((f) => errs[f])
    if (first) inputRefs.current[first]?.focus()
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const joinedCode = verificationCode.join('')

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setInterval(() => {
      setResendIn((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendIn])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!email.trim()) {
      errs.email = 'Veuillez saisir votre adresse email.'
    } else if (!emailRegex.test(email.trim())) {
      errs.email = 'Veuillez saisir une adresse email valide.'
    }
    if (!codeSent) {
      errs.verificationCode = 'Envoyez le code de vérification reçu par email.'
    } else if (!/^\d{6}$/.test(joinedCode)) {
      errs.verificationCode = 'Veuillez saisir le code de vérification à 6 chiffres.'
    }
    if (!password) {
      errs.password = 'Veuillez choisir un mot de passe.'
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errs.password = `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Veuillez confirmer votre mot de passe.'
    } else if (password && confirmPassword !== password) {
      errs.confirmPassword = 'Les deux mots de passe ne correspondent pas.'
    }
    if (!phoneNumber.trim()) {
      errs.phoneNumber = 'Veuillez saisir votre numéro de téléphone.'
    }
    if (!businessName.trim()) {
      errs.businessName = 'Veuillez saisir le nom de votre établissement.'
    }
    return errs
  }

  const handleSendCode = async () => {
    const clean = email.trim().toLowerCase()
    setError(null)
    setFieldErrors((prev) => ({ ...prev, email: '', verificationCode: '' }))

    if (!clean) {
      setFieldErrors({ email: 'Veuillez saisir votre adresse email.' })
      inputRefs.current.email?.focus()
      return
    }
    if (!emailRegex.test(clean)) {
      setFieldErrors({ email: 'Veuillez saisir une adresse email valide.' })
      inputRefs.current.email?.focus()
      return
    }
    if (resendIn > 0 || sendingCode) return

    setSendingCode(true)
    try {
      const res = await fetch('/api/auth/signup-code/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 429 && typeof json.retryAfter === 'number') setResendIn(json.retryAfter)
        setFieldErrors({ email: json.error || "Impossible d'envoyer le code. Veuillez réessayer." })
        inputRefs.current.email?.focus()
        return
      }
      setCodeSent(true)
      setVerificationCode(Array(6).fill(''))
      setResendIn(typeof json.retryAfter === 'number' ? json.retryAfter : 60)
      window.setTimeout(() => codeRefs.current[0]?.focus(), 50)
    } catch {
      setError('Problème de connexion réseau. Vérifiez votre connexion internet et réessayez.')
    } finally {
      setSendingCode(false)
    }
  }

  const handleCodeChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6)
    if (!digits) {
      setVerificationCode((current) => current.map((char, i) => (i === index ? '' : char)))
      return
    }

    setFieldErrors((prev) => ({ ...prev, verificationCode: '' }))
    setVerificationCode((current) => {
      const next = [...current]
      digits.split('').forEach((digit, offset) => {
        if (index + offset < next.length) next[index + offset] = digit
      })
      return next
    })

    const nextIndex = Math.min(5, index + digits.length)
    window.setTimeout(() => codeRefs.current[nextIndex]?.focus(), 0)
  }

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeRefs.current[index - 1]?.focus()
    }
  }

  const verifyCodeBeforeSignup = async () => {
    const res = await fetch('/api/auth/signup-code/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), code: joinedCode }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setFieldErrors({ verificationCode: json.error || 'Code de vérification incorrect.' })
      codeRefs.current[0]?.focus()
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      focusFirstError(errs)
      return
    }
    setFieldErrors({})
    setLoading(true)

    const codeOk = await verifyCodeBeforeSignup()
    if (!codeOk) {
      setLoading(false)
      return
    }

    const slug = generateSlug(businessName)
    const supabase = createClient()

    const { data: existingEmail } = await (supabase
      .from('profiles') as any)
      .select('email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (existingEmail) {
      setFieldErrors({ email: 'Cette adresse email est déjà utilisée. Connectez-vous ou utilisez une autre adresse.' })
      inputRefs.current.email?.focus()
      setLoading(false)
      return
    }

    const { data: existingBusinessName } = await (supabase
      .from('businesses') as any)
      .select('id')
      .eq('name', businessName.trim())
      .maybeSingle()

    if (existingBusinessName) {
      setFieldErrors({ businessName: 'Ce nom d\'établissement est déjà pris. Veuillez en choisir un autre.' })
      inputRefs.current.businessName?.focus()
      setLoading(false)
      return
    }

    const { data: existingSlug } = await (supabase
      .from('businesses') as any)
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existingSlug) {
      setFieldErrors({ businessName: 'Ce nom d\'établissement génère une adresse déjà utilisée. Veuillez en choisir un autre.' })
      inputRefs.current.businessName?.focus()
      setLoading(false)
      return
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { phone_number: phoneNumber } },
      })

      if (authError || !authData.user) {
        if (authError) console.error('Signup auth error:', authError.message)
        const msg = (authError?.message || '').toLowerCase()
        if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already')) {
          setFieldErrors({ email: 'Cette adresse email est déjà utilisée. Connectez-vous ou utilisez une autre adresse.' })
          inputRefs.current.email?.focus()
        } else if (msg.includes('password') && (msg.includes('weak') || msg.includes('should be') || msg.includes('at least') || msg.includes('characters'))) {
          setFieldErrors({ password: `Mot de passe trop faible. Utilisez au moins ${MIN_PASSWORD_LENGTH} caractères.` })
          inputRefs.current.password?.focus()
        } else if (msg.includes('invalid') && msg.includes('email')) {
          setFieldErrors({ email: 'Veuillez saisir une adresse email valide.' })
          inputRefs.current.email?.focus()
        } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
          setError('Problème de connexion réseau. Vérifiez votre connexion internet et réessayez.')
        } else {
          setError('Une erreur est survenue lors de la création du compte. Veuillez réessayer.')
        }
        setLoading(false)
        return
      }

      const userId = authData.user.id

      // Supabase creates the profile row via a database trigger. Poll briefly
      // for it to exist, then fall back to inserting it ourselves if it doesn't.
      let profileExists = false
      for (let i = 0; i < 10; i++) {
        const { data: profile } = await (supabase
          .from('profiles') as any)
          .select('user_id')
          .eq('user_id', userId)
          .single()

        if (profile) {
          profileExists = true
          break
        }
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      if (!profileExists) {
        const { error: profileError } = await (supabase
          .from('profiles') as any)
          .insert({
            user_id: userId,
            email: email.toLowerCase().trim(),
            phone_number: phoneNumber.trim(),
            role: 'owner',
          })

        if (profileError) {
          setError('Votre compte a été créé mais une erreur est survenue lors de la configuration. Veuillez vous connecter ou contacter le support.')
          setLoading(false)
          return
        }
      } else {
        const { error: updateError } = await (supabase
          .from('profiles') as any)
          .update({
            email: email.toLowerCase().trim(),
            phone_number: phoneNumber.trim(),
          })
          .eq('user_id', userId)

        if (updateError) {
          console.error('Error updating profile:', updateError)
        }
      }

      // If plan selected → create as pending (no expires_at), payment required first
      // If no plan → create as active with 7-day free trial
      if (plan) {
        const { data: business, error: businessError } = await (supabase
          .from('businesses') as any)
          .insert({
            owner_id: userId,
            name: businessName,
            slug: slug,
            expires_at: null,
            status: 'pending',
            theme_id: 'design12',
            // Plain QR menu by default — fidelity (points/roulette/bottom bar)
            // stays off until the owner turns it on.
            design_settings: { loyaltyEnabled: false },
          })
          .select()
          .single()

        if (businessError) {
          console.error('Business creation error:', businessError.message)
          setError('Une erreur est survenue lors de la création de votre établissement. Veuillez réessayer.')
          setLoading(false)
          return
        }

        // Pre-fill a starter demo menu, then show the first-run showcase.
        if (business?.id) await seedDemoMenu(supabase, business.id)
        // Manual payment: the owner submits their bank-transfer receipt from the dashboard.
        window.location.href = '/welcome'
      } else {
        // No plan: create with 7-day free trial
        const expirationDate = new Date()
        expirationDate.setDate(expirationDate.getDate() + 7)

        const { data: business, error: businessError } = await (supabase
          .from('businesses') as any)
          .insert({
            owner_id: userId,
            name: businessName,
            slug: slug,
            expires_at: expirationDate.toISOString(),
            status: 'active',
            theme_id: 'design12',
            // Plain QR menu by default — fidelity (points/roulette/bottom bar)
            // stays off until the owner turns it on.
            design_settings: { loyaltyEnabled: false },
          })
          .select()
          .single()

        if (businessError) {
          console.error('Business creation error:', businessError.message)
          setError('Une erreur est survenue lors de la création de votre établissement. Veuillez réessayer.')
          setLoading(false)
          return
        }

        // Pre-fill a starter demo menu, then show the first-run showcase.
        if (business?.id) await seedDemoMenu(supabase, business.id)
        window.location.href = '/welcome'
      }
    } catch (err: any) {
      console.error('Signup unexpected error:', err?.message)
      const msg = (err?.message || '').toLowerCase()
      if (msg.includes('network') || msg.includes('fetch')) {
        setError('Problème de connexion réseau. Vérifiez votre connexion internet et réessayez.')
      } else {
        setError('Une erreur inattendue est survenue. Veuillez réessayer.')
      }
      setLoading(false)
    }
  }

  const inputBase =
    'w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-[#FEFEFE] text-zinc-900 placeholder-zinc-400'
  const inputClass = (field: string) =>
    `${inputBase} ${fieldErrors[field] ? 'border-red-400' : 'border-zinc-300'}`

  return (
    <form className="space-y-5" onSubmit={handleSubmit} dir={dir} noValidate>
      {plan && (
        <div className="bg-gradient-to-l from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="h-6 w-6 shrink-0 text-orange-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="5" y="4" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M9 4.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4.5V6H9V4.5Z" fill="currentColor" />
              <path d="M9 11h6M9 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-orange-900">{t('auth.selectPlan')}: {planPriceLabel(plan)}</p>
              <p className="text-xs text-orange-700 mt-0.5">Paiement par virement bancaire — vous enverrez votre reçu depuis votre tableau de bord.</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-2">
            {t('auth.email')}
          </label>
          <div className="flex gap-2 sm:gap-3">
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              ref={(el) => { inputRefs.current.email = el }}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              className={`${inputClass('email')} ${codeSent ? 'bg-blue-50' : ''}`}
              placeholder="example@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setCodeSent(false)
                setVerificationCode(Array(6).fill(''))
                if (fieldErrors.email || fieldErrors.verificationCode) {
                  setFieldErrors(prev => ({ ...prev, email: '', verificationCode: '' }))
                }
              }}
              dir="ltr"
            />
            <button
              type="button"
              onClick={handleSendCode}
              disabled={sendingCode || resendIn > 0}
              className="shrink-0 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300 sm:px-5"
            >
              {sendingCode ? 'Envoi...' : resendIn > 0 ? `${resendIn}s` : codeSent ? 'Renvoyer' : 'Envoyer le code'}
            </button>
          </div>
          {fieldErrors.email && <p id="email-error" className="mt-1.5 text-sm text-red-600">{fieldErrors.email}</p>}
        </div>

        {codeSent && (
          <div>
            <label htmlFor="verification-code-0" className="block text-sm font-medium text-zinc-700 mb-2">
              Code de vérification (6 chiffres)
            </label>
            <div className="grid grid-cols-6 gap-2 sm:gap-3" dir="ltr">
              {verificationCode.map((digit, index) => (
                <input
                  key={index}
                  id={`verification-code-${index}`}
                  ref={(el) => { codeRefs.current[index] = el }}
                  value={digit}
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  aria-label={`Chiffre ${index + 1} du code de vérification`}
                  aria-invalid={!!fieldErrors.verificationCode}
                  className={`aspect-square w-full rounded-xl border bg-[#FEFEFE] text-center text-xl font-semibold text-zinc-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-orange-500 ${fieldErrors.verificationCode ? 'border-red-400' : 'border-zinc-300'}`}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                  onPaste={(e) => {
                    e.preventDefault()
                    handleCodeChange(index, e.clipboardData.getData('text'))
                  }}
                />
              ))}
            </div>
            {fieldErrors.verificationCode && (
              <p className="mt-1.5 text-sm text-red-600">{fieldErrors.verificationCode}</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-2">
            {t('auth.password')}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            ref={(el) => { inputRefs.current.password = el }}
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
            className={inputClass('password')}
            placeholder="••••••••"
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' })) }}
          />
          {fieldErrors.password
            ? <p id="password-error" className="mt-1.5 text-sm text-red-600">{fieldErrors.password}</p>
            : <p id="password-hint" className="mt-1.5 text-xs text-zinc-500">Au moins {MIN_PASSWORD_LENGTH} caractères.</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-700 mb-2">
            Confirmer le mot de passe
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            ref={(el) => { inputRefs.current.confirmPassword = el }}
            aria-invalid={!!fieldErrors.confirmPassword}
            aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
            className={inputClass('confirmPassword')}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: '' })) }}
          />
          {fieldErrors.confirmPassword && <p id="confirmPassword-error" className="mt-1.5 text-sm text-red-600">{fieldErrors.confirmPassword}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 mb-2">
            {t('auth.phone')}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            ref={(el) => { inputRefs.current.phoneNumber = el }}
            aria-invalid={!!fieldErrors.phoneNumber}
            aria-describedby={fieldErrors.phoneNumber ? 'phone-error' : undefined}
            className={inputClass('phoneNumber')}
            placeholder={t('auth.phonePlaceholder')}
            value={phoneNumber}
            onChange={(e) => { setPhoneNumber(e.target.value); if (fieldErrors.phoneNumber) setFieldErrors(prev => ({ ...prev, phoneNumber: '' })) }}
            dir="ltr"
          />
          {fieldErrors.phoneNumber && <p id="phone-error" className="mt-1.5 text-sm text-red-600">{fieldErrors.phoneNumber}</p>}
        </div>

        <div>
          <label htmlFor="business" className="block text-sm font-medium text-zinc-700 mb-2">
            {t('auth.establishmentName')}
          </label>
          <input
            id="business"
            name="business"
            type="text"
            required
            ref={(el) => { inputRefs.current.businessName = el }}
            aria-invalid={!!fieldErrors.businessName}
            aria-describedby={fieldErrors.businessName ? 'business-error' : undefined}
            className={inputClass('businessName')}
            placeholder={t('auth.establishmentNamePlaceholder')}
            value={businessName}
            onChange={(e) => { setBusinessName(e.target.value); if (fieldErrors.businessName) setFieldErrors(prev => ({ ...prev, businessName: '' })) }}
          />
          {fieldErrors.businessName && <p id="business-error" className="mt-1.5 text-sm text-red-600">{fieldErrors.businessName}</p>}
        </div>
      </div>

      {!plan && (
        <div className="bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="h-6 w-6 shrink-0 text-blue-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3.5" y="8.5" width="17" height="5" rx="1" stroke="currentColor" strokeWidth="1.8" />
              <path d="M5 13.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6.5M12 8.5V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 8.5S10.5 4 8 4a2 2 0 1 0 0 4.5h4Zm0 0S13.5 4 16 4a2 2 0 1 1 0 4.5h-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-blue-700">{t('pricing.freeTrial')}</p>
              <p className="text-xs text-blue-700 mt-0.5">{t('pricing.freeTrialDesc')}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" aria-live="assertive" className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-orange-600 text-white rounded-xl text-base font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-orange-500 disabled:opacity-50 transition-colors"
        >
          {loading ? t('auth.signingUp') : t('auth.createAccount')}
        </button>
      </div>
    </form>
  )
}
