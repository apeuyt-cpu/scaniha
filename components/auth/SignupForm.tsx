'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateSlug } from '@/lib/utils/slug'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { useCurrency } from '@/lib/i18n/CurrencyContext'
import CurrencySelector from '@/components/ui/CurrencySelector'

export default function SignupForm({ plan }: { plan?: string }) {
  const { t, dir } = useLocale()
  const { formatPrice, convertFromTnd, currencyCode } = useCurrency()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!email || !password || !phoneNumber || !businessName) {
      setError(t('auth.required'))
      setLoading(false)
      return
    }

    const slug = generateSlug(businessName)

    const { data: existingEmail } = await (supabase
      .from('profiles') as any)
      .select('email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (existingEmail) {
      setError(t('auth.errorGeneric'))
      setLoading(false)
      return
    }

    const { data: existingBusinessName } = await (supabase
      .from('businesses') as any)
      .select('id')
      .eq('name', businessName.trim())
      .maybeSingle()

    if (existingBusinessName) {
      setError(t('auth.errorGeneric'))
      setLoading(false)
      return
    }

    const { data: existingSlug } = await (supabase
      .from('businesses') as any)
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existingSlug) {
      setError(t('auth.errorGeneric'))
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
        setError(authError?.message || t('auth.errorGeneric'))
        setLoading(false)
        return
      }

      const userId = authData.user.id

      let profileExists = false
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 300))
        const { data: profile } = await (supabase
          .from('profiles') as any)
          .select('user_id')
          .eq('user_id', userId)
          .single()

        if (profile) {
          profileExists = true
          break
        }
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
          setError(t('auth.errorGeneric'))
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
        const { error: businessError } = await (supabase
          .from('businesses') as any)
          .insert({
            owner_id: userId,
            name: businessName,
            slug: slug,
            expires_at: null,
            status: 'pending',
            currency: currencyCode,
          })
          .select()
          .single()

        if (businessError) {
          setError(businessError.message || t('auth.errorGeneric'))
          setLoading(false)
          return
        }

        // Redirect to Dodo checkout
        try {
          const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId: plan, email }),
          })
          const data = await res.json()
          if (data.url) {
            window.location.href = data.url
            return
          }
        } catch (e) {
          console.error('Checkout redirect failed:', e)
        }

        window.location.href = '/admin'
      } else {
        // No plan: create with 7-day free trial
        const expirationDate = new Date()
        expirationDate.setDate(expirationDate.getDate() + 7)

        const { error: businessError } = await (supabase
          .from('businesses') as any)
          .insert({
            owner_id: userId,
            name: businessName,
            slug: slug,
            expires_at: expirationDate.toISOString(),
            status: 'active',
            currency: currencyCode,
          })
          .select()
          .single()

        if (businessError) {
          setError(businessError.message || t('auth.errorGeneric'))
          setLoading(false)
          return
        }

        window.location.href = '/admin'
      }
    } catch (err: any) {
      setError(err.message || t('auth.errorGeneric'))
      setLoading(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} dir={dir}>
      {plan && (
        <div className="bg-gradient-to-l from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">📋</div>
            <div>
              <p className="text-sm font-semibold text-orange-900">{t('auth.selectPlan')}: {formatPrice(convertFromTnd(plan === 'lifetime' ? 600 : plan === '1year' ? 250 : 150))}</p>
              <p className="text-xs text-orange-700 mt-0.5">{t('checkout.redirecting')}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-2">
            {t('auth.email')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
          />
        </div>

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
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 mb-2">
            {t('auth.phone')}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
            placeholder={t('auth.phonePlaceholder')}
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            dir="ltr"
          />
        </div>

        <div>
          <label htmlFor="business" className="block text-sm font-medium text-zinc-700 mb-2">
            {t('auth.businessName')}
          </label>
          <input
            id="business"
            name="business"
            type="text"
            required
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
            placeholder={t('dashboard.businessNamePlaceholder')}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            {t('auth.menuCurrency')}
          </label>
          <p className="text-xs text-zinc-500 mb-2">{t('auth.menuCurrencyDesc')}</p>
          <CurrencySelector showLabel={true} />
        </div>
      </div>

      {!plan && (
        <div className="bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🎁</div>
            <div>
              <p className="text-sm font-semibold text-blue-900">{t('pricing.freeTrial')}</p>
              <p className="text-xs text-blue-700 mt-0.5">{t('pricing.freeTrialDesc')}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-zinc-900 text-white rounded-xl text-base font-medium hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 disabled:opacity-50 transition-colors"
        >
          {loading ? t('auth.signingUp') : plan ? t('auth.createAccount') : t('auth.createAccount')}
        </button>
      </div>
    </form>
  )
}
