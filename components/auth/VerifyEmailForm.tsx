'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  initialEmail?: string
}

export default function VerifyEmailForm({ initialEmail }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const emailSentRef = useRef(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleSendCode = useCallback(async (emailToSend: string) => {
    setError(null)
    setResending(true)

    try {
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToSend }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          const match = data.error?.match(/(\d+)/)
          const seconds = match ? parseInt(match[1]) : 60
          setResendCooldown(seconds)
          setError(data.error)
        } else {
          setError(data.error || 'Erreur lors de l\'envoi du code.')
        }
        return
      }

      setResendCooldown(60)
      setEmailSent(true)
      emailSentRef.current = true
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setResending(false)
    }
  }, [])

  useEffect(() => {
    if (initialEmail && !emailSentRef.current) {
      handleSendCode(initialEmail)
    }
  }, [initialEmail, handleSendCode])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value.slice(0, 1)
    setCode(newCode)
    setError(null)

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newCode = [...code]
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || ''
    }
    setCode(newCode)
    if (pasted.length === 6) {
      inputRefs.current[5]?.focus()
    }
  }

  const handleVerify = async () => {
    const fullCode = code.join('')
    if (fullCode.length !== 6 || !email) {
      setError('Veuillez entrer le code à 6 chiffres.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Code incorrect.')
        if (data.error?.includes('Trop de tentatives') || data.error?.includes('expiré')) {
          setCode(['', '', '', '', '', ''])
          inputRefs.current[0]?.focus()
          handleSendCode(email)
        }
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/welcome')
        router.refresh()
      }, 1500)
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
      setLoading(false)
    }
  }

  const handleResend = () => {
    if (resendCooldown > 0 || resending || !email) return
    setCode(['', '', '', '', '', ''])
    inputRefs.current[0]?.focus()
    handleSendCode(email)
  }

  const inputBase =
    'w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-[#FEFEFE] text-zinc-900 placeholder-zinc-400'

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-zinc-900">Email v&eacute;rifi&eacute; !</h2>
        <p className="text-sm text-zinc-500">Redirection en cours...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-2">
          Adresse email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${inputBase} border-zinc-300`}
          placeholder="example@email.com"
          dir="ltr"
        />
      </div>

      {!emailSent ? (
        <button
          onClick={() => email && handleSendCode(email)}
          disabled={!email || resending}
          className="w-full py-3 px-4 bg-orange-600 text-white rounded-xl text-base font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-orange-500 disabled:opacity-50 transition-colors"
        >
          {resending ? 'Envoi en cours...' : 'Envoyer le code'}
        </button>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Code de v&eacute;rification
            </label>
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`w-12 h-14 text-center text-xl font-bold border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-[#FEFEFE] text-zinc-900 ${error ? 'border-red-400' : 'border-zinc-300'}`}
                  aria-label={`Chiffre ${i + 1} du code`}
                />
              ))}
            </div>
          </div>

          {error && (
            <div role="alert" aria-live="assertive" className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={loading || code.join('').length !== 6}
            className="w-full py-3 px-4 bg-orange-600 text-white rounded-xl text-base font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-orange-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Vérification...' : 'Vérifier'}
          </button>

          <div className="text-center">
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}
              className="text-sm font-medium text-orange-600 hover:text-orange-700 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors"
            >
              {resending
                ? 'Envoi en cours...'
                : resendCooldown > 0
                  ? `Renvoyer le code (${resendCooldown}s)`
                  : 'Renvoyer le code'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
