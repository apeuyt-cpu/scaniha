'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateSlug } from '@/lib/utils/slug'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { PAYMENT_PLANS } from '@/lib/payment-config'
import { seedDemoMenu } from '@/lib/demo-menu-seed'
import PhoneInput, { validatePhoneForCountry, COUNTRIES, type Country } from '@/components/ui/PhoneInput'

const MIN_PASSWORD_LENGTH = 8

// Default country Tunisia — the app's primary market
const DEFAULT_SIGNUP_COUNTRY = COUNTRIES.find((c) => c.iso2 === 'TN')!

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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneCountry, setPhoneCountry] = useState<Country>(DEFAULT_SIGNUP_COUNTRY)
  const [businessName, setBusinessName] = useState('')
  const [verificationCode, setVerificationCode] = useState<string[]>(Array(6).fill(''))
  const [codeSent, setCodeSent] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  // Field order drives where focus moves on validation failure (accessibility).
  const fieldOrder = ['email', 'verificationCode', 'password', 'confirmPassword', 'phoneNumber', 'businessName', 'termsAccepted'] as const
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
    } else {
      // Extract subscriber number (everything after the dial code)
      const dialCode = phoneCountry.dialCode
      const subscriberPart = phoneNumber.startsWith(dialCode)
        ? phoneNumber.slice(dialCode.length).trim()
        : phoneNumber.trim()
      const phoneErr = validatePhoneForCountry(subscriberPart, phoneCountry)
      if (phoneErr) errs.phoneNumber = phoneErr
    }
    if (!businessName.trim()) {
      errs.businessName = 'Veuillez saisir le nom de votre établissement.'
    }
    if (!termsAccepted) {
      errs.termsAccepted = 'Vous devez accepter les conditions générales et la politique de confidentialité pour continuer.'
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
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              ref={(el) => { inputRefs.current.password = el }}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
              className={`${inputClass('password')} pr-10`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' })) }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>)}
            </button>
          </div>
          {fieldErrors.password
            ? <p id="password-error" className="mt-1.5 text-sm text-red-600">{fieldErrors.password}</p>
            : <p id="password-hint" className="mt-1.5 text-xs text-zinc-500">Au moins {MIN_PASSWORD_LENGTH} caractères.</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-700 mb-2">
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              ref={(el) => { inputRefs.current.confirmPassword = el }}
              aria-invalid={!!fieldErrors.confirmPassword}
              aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
              className={`${inputClass('confirmPassword')} pr-10`}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: '' })) }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none"
              tabIndex={-1}
            >
              {showConfirmPassword ? (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>)}
            </button>
          </div>
          {fieldErrors.confirmPassword && <p id="confirmPassword-error" className="mt-1.5 text-sm text-red-600">{fieldErrors.confirmPassword}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 mb-2">
            {t('auth.phone')}
          </label>
          <PhoneInput
            id="phone"
            value={phoneNumber}
            onChange={(fullValue, _isValid, country) => {
              setPhoneNumber(fullValue)
              setPhoneCountry(country)
              if (fieldErrors.phoneNumber) setFieldErrors(prev => ({ ...prev, phoneNumber: '' }))
            }}
            error={fieldErrors.phoneNumber}
            onBlurValidate={(err) => {
              if (err) setFieldErrors(prev => ({ ...prev, phoneNumber: err }))
            }}
            inputRef={(el) => { inputRefs.current.phoneNumber = el }}
            ariaDescribedBy={fieldErrors.phoneNumber ? 'phone-error' : undefined}
          />
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

      {/* Terms and Privacy Policy Checkbox */}
      <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex h-5 items-center">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            required
            ref={(el) => { inputRefs.current.termsAccepted = el }}
            checked={termsAccepted}
            onChange={(e) => {
              setTermsAccepted(e.target.checked)
              if (fieldErrors.termsAccepted) setFieldErrors(prev => ({ ...prev, termsAccepted: '' }))
            }}
            className="h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="terms" className="text-sm font-medium text-zinc-800 cursor-pointer">
            J'accepte les{' '}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                setIsPrivacyModalOpen(true)
              }}
              className="text-orange-600 hover:text-orange-700 underline focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-sm"
            >
              Conditions générales et la Politique de confidentialité
            </button>
            {' '}<span className="text-red-500">*</span>
          </label>
          {fieldErrors.termsAccepted && (
            <p className="mt-1 text-sm text-red-600 font-medium">{fieldErrors.termsAccepted}</p>
          )}
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-orange-600 text-white rounded-xl text-base font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-orange-500 disabled:opacity-50 transition-colors"
        >
          {loading ? t('auth.signingUp') : t('auth.createAccount')}
        </button>
      </div>
      {/* Privacy Policy Modal Overlay */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" dir="ltr">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsPrivacyModalOpen(false)}
            aria-hidden="true"
          />
          
          {/* Modal Content */}
          <div 
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-modal-title"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
              <h2 id="privacy-modal-title" className="text-lg font-bold text-zinc-900">
                Politique de Confidentialité & Conditions d'Utilisation
              </h2>
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-lg p-1"
                aria-label="Fermer"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-6 text-sm text-zinc-600 space-y-6 scrollbar-thin">
              <section>
                <h3 className="font-bold text-zinc-900 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  1. Conformité Internationale (Standard ISO/IEC 27001 & RGPD)
                </h3>
                <p>
                  Ce document certifie la conformité de Scaniha avec les normes internationales relatives à la sécurité 
                  de l'information et à la gestion des données numériques commerciales.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-zinc-900 mb-2">2. Droits d'Accès et Traitement des Données</h3>
                <p>
                  En créant un compte sur cette plateforme, l'établissement (le Souscripteur) reconnaît, autorise et accorde 
                  expressément à <strong>Scaniha et à ses administrateurs officiels</strong> le droit absolu d'accéder, 
                  de traiter, de modérer et de gérer l'intégralité des données hébergées sur le service. Cela inclut, sans 
                  s'y limiter : les données de l'établissement, les statistiques de scan, le menu, ainsi que toute 
                  donnée client (utilisateurs finaux) collectée via l'utilisation du code QR.
                </p>
                <p className="mt-2">
                  Cet accès est garanti à des fins de maintenance, de sécurité, d'audit légal et d'amélioration continue 
                  du service, conformément à la législation internationale en vigueur.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-zinc-900 mb-2">3. Responsabilité Légale du Souscripteur</h3>
                <p>
                  Le Souscripteur confirme que toutes les données collectées via son menu QR le sont de manière pleinement légale. 
                  Il s'engage à respecter les droits des consommateurs finaux. Scaniha agit en tant que prestataire technologique 
                  et décline toute responsabilité quant à l'usage illicite des données par l'établissement.
                </p>
              </section>
              
              <section>
                <h3 className="font-bold text-zinc-900 mb-2">4. Propriété et Rétention</h3>
                <p>
                  Scaniha se réserve le droit de suspendre, supprimer ou modifier tout compte enfreignant les présentes 
                  conditions, avec ou sans préavis. Les données sont hébergées sur des serveurs sécurisés et chiffrés.
                </p>
              </section>
            </div>
            
            <div className="border-t border-zinc-100 bg-zinc-50 px-6 py-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setTermsAccepted(true)
                  if (fieldErrors.termsAccepted) setFieldErrors(prev => ({ ...prev, termsAccepted: '' }))
                  setIsPrivacyModalOpen(false)
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-6 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                J'accepte
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
