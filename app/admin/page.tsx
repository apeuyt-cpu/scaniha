'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/client'
import LogoUpload from '@/components/business/LogoUpload'
import SettingsManager from '@/components/admin/SettingsManager'
import WheelManager from '@/components/wheel/WheelManager'
import MenuAnalytics from '@/components/admin/MenuAnalytics'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { useCurrency } from '@/lib/i18n/CurrencyContext'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import CurrencySelector from '@/components/ui/CurrencySelector'

interface Business {
  id: string
  name: string
  slug: string
  theme_id: string
  status: 'active' | 'paused' | 'pending'
  logo_url: string | null
  expires_at: string | null
  primary_color: string | null
  wheel_enabled: boolean
  wheel_visible: boolean
}

export default function AdminDashboard() {
  const { t, dir } = useLocale()
  const { formatPrice, currencyCode, setCurrency, convertFromTnd } = useCurrency()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [activeTheme, setActiveTheme] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [subscribeLoading, setSubscribeLoading] = useState(false)
  const [showPlanPicker, setShowPlanPicker] = useState(false)
  const [countdown, setCountdown] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchBusiness()
  }, [])

  useEffect(() => {
    if (business?.slug) {
      generateQR()
      setActiveTheme(business.theme_id)
    }
  }, [business?.slug])

  useEffect(() => {
    if (!business?.expires_at) {
      setCountdown(null)
      return
    }

    const updateCountdown = () => {
      const now = new Date().getTime()
      const expiry = new Date(business.expires_at!).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }

      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [business?.expires_at])

  const fetchBusiness = async () => {
    try {
      const res = await fetch('/api/admin/business')
      if (res.ok) {
        const contentType = res.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json()
          setBusiness(data)
        } else {
          if (res.status === 401 || res.status === 403) {
            window.location.href = '/login'
          }
        }
      } else {
        const contentType = res.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await res.json()
          console.error('Error fetching business:', errorData.error || 'Unknown error')
        } else {
          if (res.status === 401 || res.status === 403) {
            window.location.href = '/login'
          }
        }
      }
    } catch (err) {
      console.error('Error fetching business:', err)
      if (err instanceof SyntaxError && err.message.includes('JSON')) {
        window.location.reload()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (planId: string) => {
    setSubscribeLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'فشل إنشاء رابط الدفع')
      }
    } catch (err) {
      console.error('Subscribe error:', err)
      alert('حدث خطأ. يرجى المحاولة مرة أخرى.')
    } finally {
      setSubscribeLoading(false)
    }
  }

  const generateQR = async () => {
    if (!business?.slug) return
    try {
      const menuUrl = `${window.location.origin}/${business.slug}`
      const dataUrl = await QRCode.toDataURL(menuUrl, {
        width: 200,
        margin: 1,
        color: { dark: '#18181b', light: '#FFFFFF' }
      })
      setQrDataUrl(dataUrl)
    } catch (err) {
      console.error('QR error:', err)
    }
  }

  const handleThemeChange = async (themeId: string) => {
    try {
      await (supabase.from('businesses') as any)
        .update({ theme_id: themeId })
        .eq('id', business?.id)
      setActiveTheme(themeId)
      fetchBusiness()
    } catch (err) {
      console.error('Theme update error:', err)
    }
  }

  const copyUrl = () => {
    if (!business) return
    navigator.clipboard.writeText(`${window.location.origin}/${business.slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadQR = () => {
    if (!qrDataUrl || !business) return
    const link = document.createElement('a')
    link.download = `${business.slug}-qr.png`
    link.href = qrDataUrl
    link.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (!business) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-zinc-500">لم يتم العثور على نشاط تجاري</p>
        </div>
      </div>
    )
  }

  // ─── Pending Payment Page ─────────────────────────────────────
  if (business.status === 'pending') {
    return (
      <div className="admin-page p-4 lg:p-8 max-w-6xl mx-auto" dir={dir}>
        <div className="max-w-lg mx-auto text-center">
          <div className="text-6xl mb-6">💳</div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">{t('dashboard.subscribeToAccess')}</h1>
          <p className="text-zinc-600 mb-2">{t('dashboard.businessName')} {business.name} {t('dashboard.pendingPayment')}.</p>
          <p className="text-zinc-500 text-sm mb-8">{t('pricing.selectPlan')}</p>

          <div className={`space-y-4 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
            <button
              onClick={() => handleSubscribe('6months')}
              disabled={subscribeLoading}
              className={`w-full bg-white border-2 border-zinc-200 rounded-2xl p-6 hover:border-orange-500 transition-all ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
            >
              <h3 className="text-xl font-bold text-zinc-900">{t('pricing.plan6months')}</h3>
              <p className="text-3xl font-bold text-zinc-900 mt-1">{formatPrice(convertFromTnd(150))}</p>
            </button>

            <button
              onClick={() => handleSubscribe('1year')}
              disabled={subscribeLoading}
              className={`w-full bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-2xl p-6 shadow-lg transition-all ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-white text-orange-600 px-2 py-0.5 rounded-full font-bold">{t('pricing.mostPopular')}</span>
              </div>
              <h3 className="text-xl font-bold">{t('pricing.plan1year')}</h3>
              <p className="text-3xl font-bold mt-1">{formatPrice(convertFromTnd(250))}</p>
            </button>

            <button
              onClick={() => handleSubscribe('lifetime')}
              disabled={subscribeLoading}
              className={`w-full bg-gradient-to-br from-[#1a0a2e] via-zinc-900 to-[#2a1a00] text-white rounded-2xl p-6 shadow-lg transition-all text-right border border-amber-500/30 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-gradient-to-l from-amber-400 to-yellow-300 text-zinc-900 px-2 py-0.5 rounded-full font-bold">✦ {t('pricing.bestValue')} ✦</span>
              </div>
              <h3 className="text-xl font-bold">{t('pricing.planLifetime')}</h3>
              <p className="text-3xl font-bold mt-1 text-amber-300">{formatPrice(convertFromTnd(600))}</p>
            </button>
          </div>

          {subscribeLoading && (
            <p className="mt-6 text-zinc-500">{t('checkout.redirecting')}</p>
          )}
        </div>
      </div>
    )
  }

  // ─── Active Dashboard ─────────────────────────────────────────
  const menuUrl = `${window.location.origin}/${business.slug}`
  const themes = [
    { id: 'classic', name: 'Classic', color: '#8B2635', bg: '#FFFDF9' },
    { id: 'dark', name: 'Dark', color: '#D4AF37', bg: '#0A0A0A' },
    { id: 'minimal', name: 'Minimal', color: '#E85D04', bg: '#F7F7F5' },
  ]

  const isExpired = countdown && countdown.days === 0 && countdown.hours === 0 && countdown.minutes === 0 && countdown.seconds === 0
  const isUrgent = countdown && countdown.days <= 3

  return (
    <>
      <style jsx>{`
        @keyframes pulse-urgent {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .pulse-urgent {
          animation: pulse-urgent 1s infinite;
        }
      `}</style>

      <div className="admin-page p-4 lg:p-8 max-w-6xl mx-auto" dir={dir}>
        {/* Subscription Banner */}
        {countdown && (
          <div className={`mb-6 rounded-2xl p-4 lg:p-6 ${
            isExpired
              ? 'bg-red-500 text-white'
              : isUrgent
                ? 'bg-amber-500 text-white pulse-urgent'
                : 'bg-gradient-to-l from-blue-500 to-blue-600 text-white'
          }`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-lg">
                  {isExpired ? t('pricing.expired') : isUrgent ? t('pricing.expiresSoon', { days: countdown.days }) : t('pricing.active')}
                </h3>
                <p className="text-sm opacity-90">
                  {isExpired ? t('dashboard.subscribeToAccess') : t('pricing.orRenew')}
                </p>
              </div>

              {!isExpired && (
                <div className="flex gap-3 text-center">
                  <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 min-w-[60px]">
                    <div className="text-2xl lg:text-3xl font-bold">{countdown.days}</div>
                    <div className="text-xs opacity-80">{t('common.all') === 'All' ? 'days' : 'يوم'}</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 min-w-[60px]">
                    <div className="text-2xl lg:text-3xl font-bold">{countdown.hours}</div>
                    <div className="text-xs opacity-80">{t('common.all') === 'All' ? 'hrs' : 'ساعة'}</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 min-w-[60px]">
                    <div className="text-2xl lg:text-3xl font-bold">{countdown.minutes}</div>
                    <div className="text-xs opacity-80">{t('common.all') === 'All' ? 'min' : 'دقيقة'}</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 min-w-[60px]">
                    <div className="text-2xl lg:text-3xl font-bold">{countdown.seconds}</div>
                    <div className="text-xs opacity-80">{t('common.all') === 'All' ? 'sec' : 'ثانية'}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subscribe / Extend Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowPlanPicker(true)}
            disabled={subscribeLoading}
            className="w-full bg-gradient-to-l from-orange-500 to-amber-500 text-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-lg">
                {isExpired ? '🔴 ' + t('pricing.renew') : '🟢 ' + t('pricing.orRenew')}
              </span>
              <span className="text-sm opacity-90">{t('pricing.selectPlan')} ←</span>
            </div>
          </button>
        </div>

        {/* Plan Picker Modal */}
        {showPlanPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir={dir}>
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowPlanPicker(false)} />
            <div className="relative bg-white rounded-3xl p-6 lg:p-8 max-w-sm w-full shadow-2xl">
              <button
                onClick={() => setShowPlanPicker(false)}
                className="absolute top-4 left-4 text-zinc-400 hover:text-zinc-600 text-2xl leading-none"
              >
                ✕
              </button>
              <h2 className="text-xl font-bold text-zinc-900 mb-1">{t('pricing.selectPlan')}</h2>
              <p className="text-zinc-500 text-sm mb-6">{t('pricing.orRenew')}</p>

              <div className={`space-y-3 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                <button
                  onClick={() => { setShowPlanPicker(false); handleSubscribe('6months') }}
                  disabled={subscribeLoading}
                  className={`w-full bg-white border-2 border-zinc-200 rounded-2xl p-5 hover:border-orange-500 transition-all ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                >
                  <h3 className="text-lg font-bold text-zinc-900">{t('pricing.plan6months')}</h3>
                  <p className="text-2xl font-bold text-zinc-900 mt-1">{formatPrice(convertFromTnd(150))}</p>
                </button>

                <button
                  onClick={() => { setShowPlanPicker(false); handleSubscribe('1year') }}
                  disabled={subscribeLoading}
                  className={`w-full bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-2xl p-5 shadow-lg transition-all ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-white text-orange-600 px-2 py-0.5 rounded-full font-bold">{t('pricing.mostPopular')}</span>
                  </div>
                  <h3 className="text-lg font-bold">{t('pricing.plan1year')}</h3>
                  <p className="text-2xl font-bold mt-1">{formatPrice(convertFromTnd(250))}</p>
                </button>

                <button
                  onClick={() => { setShowPlanPicker(false); handleSubscribe('lifetime') }}
                  disabled={subscribeLoading}
                  className={`w-full bg-gradient-to-br from-[#1a0a2e] via-zinc-900 to-[#2a1a00] text-white rounded-2xl p-5 shadow-lg transition-all border border-amber-500/30 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-gradient-to-l from-amber-400 to-yellow-300 text-zinc-900 px-2 py-0.5 rounded-full font-bold">✦ {t('pricing.bestValue')} ✦</span>
                  </div>
                  <h3 className="text-lg font-bold">{t('pricing.planLifetime')}</h3>
                  <p className="text-2xl font-bold mt-1 text-amber-300">{formatPrice(convertFromTnd(600))}</p>
                </button>
              </div>

              {subscribeLoading && (
                <p className="mt-4 text-center text-zinc-500">{t('checkout.redirecting')}</p>
              )}
            </div>
          </div>
        )}

        {/* Language & Currency Selector */}
        <div className="flex items-center gap-2 mb-6">
          <LanguageSwitcher />
          <CurrencySelector />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            {business.logo_url ? (
              <img 
                src={business.logo_url} 
                alt="" 
                className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl object-cover border border-zinc-200"
              />
            ) : (
              <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl bg-zinc-200 flex items-center justify-center text-zinc-400 text-xl font-medium">
                {business.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-zinc-900">{business.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${business.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`} />
                <span className="text-sm lg:text-base text-zinc-500">
                  {business.status === 'active' ? t('pricing.active') : t('dashboard.menuPaused')}
                </span>
              </div>
            </div>
          </div>

          <a
            href={menuUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-zinc-900 text-white text-sm lg:text-base font-medium rounded-xl hover:bg-zinc-800 transition-colors"
          >
            {t('dashboard.viewMenu')} ←
          </a>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {/* Menu Builder Card */}
          <Link
            href="/admin/menu"
            className="group bg-white rounded-2xl p-5 lg:p-6 border border-zinc-200 hover:border-zinc-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
              <span className="text-zinc-400 group-hover:text-zinc-600 transition-colors text-xl">←</span>
            </div>
            <h3 className="font-bold text-zinc-900 text-lg lg:text-xl mb-1">{t('dashboard.manageMenu')}</h3>
            <p className="text-zinc-500 text-sm lg:text-base">{t('dashboard.addItems')}</p>
          </Link>

          {/* QR Code Card */}
          <div className="bg-white rounded-2xl p-5 lg:p-6 border border-zinc-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-zinc-900 text-lg lg:text-xl mb-1">QR Code</h3>
                <p className="text-zinc-500 text-sm lg:text-base mb-4">{t('dashboard.viewMenu')}</p>
                <button
                  onClick={downloadQR}
                  disabled={!qrDataUrl}
                  className="px-4 py-2 bg-zinc-100 text-zinc-700 text-sm lg:text-base font-medium rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  {t('common.save')}
                </button>
              </div>
              {qrDataUrl && (
                <img src={qrDataUrl} alt="QR" className="w-24 h-24 lg:w-28 lg:h-28 rounded-xl" />
              )}
            </div>
          </div>

          {/* Menu URL Card */}
          <div className="bg-white rounded-2xl p-5 lg:p-6 border border-zinc-200">
            <h3 className="font-bold text-zinc-900 text-lg lg:text-xl mb-1">{t('dashboard.menuUrl')}</h3>
            <p className="text-zinc-500 text-sm lg:text-base mb-4">{t('settings.copy')}</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 text-sm lg:text-base bg-zinc-100 px-3 py-2 rounded-xl text-zinc-600 truncate" dir="ltr">
                /{business.slug}
              </code>
              <button
                onClick={copyUrl}
                className={`px-4 py-2 text-sm lg:text-base font-medium rounded-xl transition-colors ${
                  copied 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                {copied ? '✓' : t('settings.copy')}
              </button>
            </div>
          </div>
        </div>

        {/* Theme Selector */}
        <div className="bg-white rounded-2xl p-5 lg:p-6 border border-zinc-200 mb-5">
          <h3 className="font-bold text-zinc-900 text-lg lg:text-xl mb-4">{t('settings.appearance')}</h3>
          <div className="flex gap-3">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  activeTheme === theme.id
                    ? 'border-zinc-900 shadow-md'
                    : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div 
                  className="h-10 lg:h-12 rounded-lg mb-3 flex items-center justify-center"
                  style={{ backgroundColor: theme.bg }}
                >
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: theme.color }}
                  />
                </div>
                <p className="text-sm lg:text-base font-medium text-zinc-700 text-center">{theme.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Menu Analytics */}
        <div className="mb-5">
          <MenuAnalytics />
        </div>

        {/* Lucky Wheel */}
        {business.wheel_enabled && (
          <div className="mb-5">
            <WheelManager businessId={business.id} initialVisible={business.wheel_visible} />
          </div>
        )}

        {/* Settings Manager */}
        <SettingsManager business={business} onUpdate={fetchBusiness} />
      </div>
    </>
  )
}
