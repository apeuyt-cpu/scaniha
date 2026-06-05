'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { useLocale, useTranslation } from '@/lib/i18n/LocaleContext'
import { useCurrency } from '@/lib/i18n/CurrencyContext'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import CurrencySelector from '@/components/ui/CurrencySelector'

function useScrollReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal'))
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

export default function LandingPage() {
  const { t, locale, dir } = useLocale()
  const { formatPrice, currencyCode, convertFromTnd } = useCurrency()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showStickyCta, setShowStickyCta] = useState(false)
  const heroRef = useRef<HTMLElement | null>(null)

  useScrollReveal()

  useEffect(() => {
    const onScroll = () => {
      const heroBottom = heroRef.current?.getBoundingClientRect().bottom ?? 600
      setShowStickyCta(heroBottom < 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="landing min-h-screen" dir={dir}>
      {/* Header with Logo and Navigation */}
      <header className="w-full py-4 px-4 sm:px-6 lg:px-8 border-b border-zinc-200/70 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Scaniha"
              width={160}
              height={56}
              className="object-contain"
              priority
              style={{ width: 'auto', height: 'auto' }}
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-4">
            <LanguageSwitcher />
            <CurrencySelector />
            <Link href="/" className="text-zinc-700 hover:text-orange-600 font-medium transition-colors">
              {t('nav.home')}
            </Link>
            <Link href="/features" className="text-zinc-700 hover:text-orange-600 font-medium transition-colors">
              {t('nav.features')}
            </Link>
            <Link href="/pricing" className="text-zinc-700 hover:text-orange-600 font-medium transition-colors">
              {t('nav.pricing')}
            </Link>
            <Link href="/blog" className="text-zinc-700 hover:text-orange-600 font-medium transition-colors">
              Blog
            </Link>
            <Link href="/about" className="text-zinc-700 hover:text-orange-600 font-medium transition-colors">
              {t('nav.about') || 'About'}
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
            >
              {t('nav.signup')}
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-zinc-700 hover:text-orange-600 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-zinc-200 mt-4 pt-4 pb-4">
            <nav className="flex flex-col gap-4 px-4">
              <div className="flex items-center gap-2 mb-2">
                <LanguageSwitcher />
                <CurrencySelector />
              </div>
              <Link
                href="/"
                className="text-zinc-700 hover:text-orange-600 font-medium transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.home')}
              </Link>
              <Link
                href="/features"
                className="text-zinc-700 hover:text-orange-600 font-medium transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.features')}
              </Link>
              <Link
                href="/pricing"
                className="text-zinc-700 hover:text-orange-600 font-medium transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.pricing')}
              </Link>
              <Link
                href="/blog"
                className="text-zinc-700 hover:text-orange-600 font-medium transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Blog
              </Link>
              <Link
                href="/about"
                className="text-zinc-700 hover:text-orange-600 font-medium transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.about') || 'About'}
              </Link>
              <Link
                href="/signup"
                className="px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.signup')}
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Modern Hero Section - Side by Side Layout */}
      <section
        ref={heroRef}
        className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-b from-[#FAFAF8] via-white to-[#FAFAF8]"
      >
        {/* Drifting gradient orbs */}
        <div className="orb orb-1 w-[460px] h-[460px] -top-24 right-[-80px]" aria-hidden="true"></div>
        <div className="orb orb-2 w-[380px] h-[380px] bottom-[-60px] left-[-60px]" aria-hidden="true"></div>

        <div className="relative max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          {/* Mobile Layout - Vertical Stack */}
          <div className="flex flex-col lg:hidden gap-6 w-full">
            {/* Badge */}
              <div className="hero-up glass-pill inline-flex items-center gap-2 px-4 py-2 rounded-full w-fit" style={{ ['--hero-delay' as string]: '0ms' }}>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-orange-700 text-sm font-bold">{t('pricing.freeTrial')}</span>
              </div>

              {/* Main Headline */}
              <h1 className="hero-up headline text-4xl sm:text-5xl font-extrabold text-zinc-900" style={{ ['--hero-delay' as string]: '120ms', textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                {t('hero.title')}
              </h1>

              {/* Image - Between headline and subheadline on mobile */}
              <div className="hero-up relative w-full" style={{ ['--hero-delay' as string]: '240ms' }}>
                <div className="float-img relative w-full aspect-[16/9] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5">
                  <Image
                    src="/hero img.jpeg"
                    alt="Scaniha"
                    fill
                    sizes="100vw"
                    className="object-cover rounded-3xl"
                    priority
                    quality={90}
                  />
                </div>
              </div>

              {/* Subheadline */}
              <p className="hero-up text-lg sm:text-xl text-zinc-600 leading-relaxed" style={{ ['--hero-delay' as string]: '320ms', textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                {t('hero.subtitle')}
              </p>

              {/* CTA Buttons */}
              <div className="hero-up flex flex-col sm:flex-row gap-4 pt-4" style={{ ['--hero-delay' as string]: '400ms' }}>
                <Link
                  href="/signup"
                  className="btn-shine px-8 py-4 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-lg shadow-lg shadow-orange-500/30 text-center"
                >
                  {t('hero.cta')}
                </Link>
                <Link
                  href="/login"
                  className="btn-shine px-8 py-4 bg-white text-zinc-900 rounded-xl font-semibold text-lg border-2 border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50 text-center"
                >
                  {t('nav.login')}
                </Link>
              </div>
            </div>

          {/* Desktop Layout - Side by Side */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Text Content */}
            <div className={`space-y-6 w-full ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
              <div className="hero-up glass-pill inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ ['--hero-delay' as string]: '0ms' }}>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-orange-700 text-sm font-bold">{t('pricing.freeTrial')}</span>
              </div>

              <h1 className="hero-up headline text-4xl sm:text-5xl lg:text-6xl font-extrabold text-zinc-900" style={{ ['--hero-delay' as string]: '120ms' }}>
                {t('hero.title')}
              </h1>

              <p className="hero-up text-lg sm:text-xl lg:text-2xl text-zinc-600 leading-relaxed" style={{ ['--hero-delay' as string]: '240ms' }}>
                {t('hero.subtitle')}
              </p>

              <div className="hero-up flex flex-col sm:flex-row gap-4 pt-4" style={{ ['--hero-delay' as string]: '340ms' }}>
                <Link
                  href="/signup"
                  className="btn-shine px-8 py-4 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-lg shadow-lg shadow-orange-500/30 text-center"
                >
                  {t('hero.cta')}
                </Link>
                <Link
                  href="/login"
                  className="btn-shine px-8 py-4 bg-white text-zinc-900 rounded-xl font-semibold text-lg border-2 border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50 text-center"
                >
                  {t('nav.login')}
                </Link>
              </div>
            </div>

            {/* Image Content - Left Side (RTL) */}
            <div className="hero-up relative w-full" style={{ ['--hero-delay' as string]: '200ms' }}>
              <div className="float-img relative w-full aspect-square max-w-lg mx-auto rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5">
                <Image
                  src="/hero img.jpeg"
                  alt="Scaniha"
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 50vw"
                  className="object-cover rounded-3xl"
                  priority
                  quality={90}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce hidden lg:block">
          <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Brand Story Section */}
      <section className="py-24 bg-gradient-to-b from-[#FAFAF8] to-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center reveal">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 mb-4">{t('hero.brandStoryTitle')}</h2>
            <p className="text-lg text-zinc-600 leading-relaxed">{t('hero.brandStory')}</p>
            <div className="flex gap-4 justify-center mt-8">
              <Link href="/about" className="text-orange-600 font-semibold hover:text-orange-700">Learn more about Scaniha →</Link>
              <Link href="/features" className="text-orange-600 font-semibold hover:text-orange-700">Explore features →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props - Quick Benefits - 3 Steps */}
      <section className="py-24 bg-gradient-to-b from-white to-[#FAFAF8]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 mb-4">
              {t('features.title')}
            </h2>
            <p className="text-lg text-zinc-600">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
            {/* Step 1 - QR Menu Builder */}
            <div className="reveal lp-card group relative overflow-hidden" style={{ ['--reveal-delay' as string]: '0ms' }}>
              <div className="badge-pop absolute top-6 right-6 w-12 h-12 bg-gradient-to-br from-[#F47B20] to-[#F5B82E] rounded-full flex items-center justify-center text-white font-extrabold text-xl shadow-lg z-10">
                1
              </div>
              <div className="relative h-64 bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden flex items-center justify-center">
                <div className="icon-container w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:shadow-lg transition-all duration-500 ease-out">
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="url(#qrGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-label="QR code icon for menu builder" role="img" className="drop-shadow-sm">
                    <defs>
                      <linearGradient id="qrGradient" x1="0" y1="0" x2="24" y2="24">
                        <stop offset="0%" stopColor="#F47B20" />
                        <stop offset="100%" stopColor="#F5B82E" />
                      </linearGradient>
                    </defs>
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    <path d="M14 14h2v2h-2z" />
                    <path d="M18 14h2v2h-2z" />
                    <path d="M14 18h4v2h-4z" />
                    <path d="M18 16h2v4h-2z" />
                    <path d="M7 7h1v1H7z" />
                    <path d="M16 7h1v1h-1z" />
                    <path d="M7 16h1v1H7z" />
                  </svg>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent pointer-events-none" />
              </div>
              <div className="p-8" style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                <h3 className="text-2xl font-extrabold text-zinc-900 mb-3">{t('features.qrBuilder.title')}</h3>
                <p className="text-zinc-600 leading-relaxed text-base">{t('features.qrBuilder.desc')}</p>
              </div>
            </div>

            {/* Step 2 - No App Required */}
            <div className="reveal lp-card group relative overflow-hidden" style={{ ['--reveal-delay' as string]: '80ms' }}>
              <div className="badge-pop absolute top-6 right-6 w-12 h-12 bg-gradient-to-br from-[#F47B20] to-[#F5B82E] rounded-full flex items-center justify-center text-white font-extrabold text-xl shadow-lg z-10">
                2
              </div>
              <div className="relative h-64 bg-gradient-to-br from-green-50 to-emerald-50 overflow-hidden flex items-center justify-center">
                <div className="icon-container w-24 h-24 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:shadow-lg transition-all duration-500 ease-out">
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="url(#phoneGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-label="smartphone with browser icon — no app download needed" role="img" className="drop-shadow-sm">
                    <defs>
                      <linearGradient id="phoneGradient" x1="0" y1="0" x2="24" y2="24">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#34D399" />
                      </linearGradient>
                    </defs>
                    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
                    <path d="M2 12h20" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent pointer-events-none" />
              </div>
              <div className="p-8" style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                <h3 className="text-2xl font-extrabold text-zinc-900 mb-3">{t('features.noApp.title')}</h3>
                <p className="text-zinc-600 leading-relaxed text-base">{t('features.noApp.desc')}</p>
              </div>
            </div>

            {/* Step 3 - Instant Updates */}
            <div className="reveal lp-card group relative overflow-hidden" style={{ ['--reveal-delay' as string]: '160ms' }}>
              <div className="badge-pop absolute top-6 right-6 w-12 h-12 bg-gradient-to-br from-[#F47B20] to-[#F5B82E] rounded-full flex items-center justify-center text-white font-extrabold text-xl shadow-lg z-10">
                3
              </div>
              <div className="relative h-64 bg-gradient-to-br from-purple-50 to-pink-50 overflow-hidden flex items-center justify-center">
                <div className="icon-container w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:shadow-lg transition-all duration-500 ease-out">
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="url(#syncGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-label="sync or refresh icon for real-time menu updates" role="img" className="drop-shadow-sm">
                    <defs>
                      <linearGradient id="syncGradient" x1="0" y1="0" x2="24" y2="24">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#EC4899" />
                      </linearGradient>
                    </defs>
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M21 21v-5h-5" />
                  </svg>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent pointer-events-none" />
              </div>
              <div className="p-8" style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                <h3 className="text-2xl font-extrabold text-zinc-900 mb-3">{t('features.instantUpdate.title')}</h3>
                <p className="text-zinc-600 leading-relaxed text-base">{t('features.instantUpdate.desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing - Prominent & Clear */}
      <section className="py-24 bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 mb-4">
              {t('pricing.title')}
            </h2>
            <p className="text-lg text-zinc-600">
              {t('pricing.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-14 items-center">
            {/* Plan 1 - 6 Months */}
            <div className="reveal lp-card md:scale-95 md:opacity-90 p-8" style={{ ['--reveal-delay' as string]: '0ms' }}>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-extrabold text-zinc-900 mb-2">{t('pricing.plan6months')}</h3>
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl font-extrabold text-zinc-900">{formatPrice(convertFromTnd(150))}</span>
                </div>
                <p className="text-sm text-zinc-500">{t('pricing.per6months')}</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-zinc-700">{t('pricing.features.items')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-zinc-700">{t('pricing.features.categories')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-zinc-700">{t('pricing.features.themes')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-zinc-700">{t('pricing.features.support')}</span>
                </li>
              </ul>
              <Link
                href="/signup?plan=6months"
                className="btn-shine block w-full text-center px-6 py-4 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800"
              >
                {t('pricing.ctaSelect')} →
              </Link>
            </div>

            {/* Plan 2 - Popular */}
            <div className="reveal pulse-glow relative bg-gradient-to-br from-[#F47B20] to-[#F5B82E] text-white rounded-2xl p-8 md:scale-105 z-10 border border-white/20" style={{ ['--reveal-delay' as string]: '80ms' }}>
              <div className="text-center mb-2">
                <span className="inline-block bg-white text-orange-600 px-4 py-1 rounded-full text-sm font-extrabold mb-4 shadow">
                  {t('pricing.mostPopular')}
                </span>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-extrabold mb-2">{t('pricing.plan1year')}</h3>
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl font-extrabold">{formatPrice(convertFromTnd(250))}</span>
                </div>
                <p className="text-sm text-white/90">{t('pricing.perYear')}</p>
                <p className="text-sm mt-2 text-yellow-100 font-semibold">{t('pricing.save', { amount: formatPrice(convertFromTnd(50)) })}</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-white text-xl">✓</span>
                  <span>{t('pricing.features.items')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-white text-xl">✓</span>
                  <span>{t('pricing.features.support')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-white text-xl">✓</span>
                  <span>{t('pricing.features.updates')}</span>
                </li>
              </ul>
              <Link
                href="/signup?plan=1year"
                className="btn-shine block w-full text-center px-6 py-4 bg-white text-orange-600 rounded-xl font-extrabold hover:bg-zinc-50"
              >
                {t('pricing.ctaSelect')} →
              </Link>
            </div>

            {/* Plan 3 - Lifetime */}
            <div className="reveal relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0a2e] via-zinc-900 to-[#2a1a00] text-white p-8 border border-amber-500/40 shadow-[0_0_40px_rgba(251,191,36,0.10)] md:scale-95 md:opacity-95" style={{ ['--reveal-delay' as string]: '160ms' }}>
              <div className="pointer-events-none absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-amber-400/20 via-transparent to-amber-400/5 opacity-60" />
              <div className="relative">
                <div className="text-center mb-2">
                  <span className="inline-block bg-gradient-to-l from-amber-400 to-yellow-300 text-zinc-900 px-5 py-1.5 rounded-full text-sm font-extrabold mb-4 shadow-lg shadow-amber-500/30">
                    ✦ {t('pricing.bestValue')} ✦
                  </span>
                </div>
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-extrabold mb-2">{t('pricing.planLifetime')}</h3>
                  <div className="flex items-baseline justify-center gap-2 mb-2">
                    <span className="text-5xl font-extrabold text-amber-300">{formatPrice(convertFromTnd(600))}</span>
                  </div>
                  <p className="text-sm text-zinc-400">{t('pricing.once')}</p>
                  <p className="text-sm mt-2 text-amber-400 font-bold bg-amber-400/10 px-3 py-1 rounded-full inline-block border border-amber-500/20">💰 {t('pricing.save', { amount: formatPrice(convertFromTnd(300)) })}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-yellow-300 text-zinc-900 text-sm font-bold shrink-0">✓</span>
                    <span>{t('pricing.features.items')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-yellow-300 text-zinc-900 text-sm font-bold shrink-0">✓</span>
                    <span>{t('pricing.features.support')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-yellow-300 text-zinc-900 text-sm font-bold shrink-0">✓</span>
                    <span>{t('pricing.features.updates')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-yellow-300 text-zinc-900 text-sm font-bold shrink-0">✓</span>
                    <span>{t('pricing.features.analytics')}</span>
                  </li>
                </ul>
                <Link
                  href="/signup?plan=lifetime"
                  className="btn-shine relative block w-full text-center px-6 py-4 bg-gradient-to-l from-amber-400 to-yellow-300 text-zinc-900 rounded-xl font-extrabold text-lg hover:from-amber-300 hover:to-yellow-200 shadow-lg shadow-amber-500/25 transition-all hover:-translate-y-0.5"
                >
                  {t('pricing.ctaSelect')} →
                </Link>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="text-center mb-8 reveal">
            <p className="text-xl font-bold text-zinc-900 mb-6">{t('checkout.paymentMethods')}</p>
            <div className="marquee">
              <div className="marquee-track py-2">
                {[0, 1].map((dup) => (
                  <div key={dup} className="flex items-center gap-8 shrink-0" aria-hidden={dup === 1}>
                    <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-xl border border-zinc-200 shadow-md hover:shadow-lg transition-shadow">
                      <Image
                        src="https://805342.fs1.hubspotusercontent-na1.net/hubfs/805342/flouci_logo_new.png"
                        alt="Flouci"
                        width={120}
                        height={45}
                        className="object-contain h-12"
                      />
                    </div>
                    <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-xl border border-zinc-200 shadow-md hover:shadow-lg transition-shadow">
                      <Image
                        src="https://www.thd.tn/wp-content/uploads/2019/12/1200x630wa-1000x600.png"
                        alt="D17"
                        width={120}
                        height={45}
                        className="object-contain h-12"
                      />
                      <span className="text-zinc-900 font-bold text-lg">D17</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-xl border border-zinc-200 shadow-md hover:shadow-lg transition-shadow">
                      <svg className="w-12 h-12 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span className="text-zinc-900 font-bold text-lg">{t('checkout.bankTransfer')}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-xl border border-zinc-200 shadow-md hover:shadow-lg transition-shadow">
                      <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none">
                        <rect width="40" height="40" rx="8" fill="#7C3AED" />
                        <path d="M12 20L18 14L24 20L18 26L12 20Z" fill="white" opacity="0.9" />
                        <path d="M18 14L24 20L18 26" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="text-zinc-900 font-bold text-lg">{t('checkout.onlinePayment')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center reveal">
            <p className="text-zinc-600 mb-4">
              {t('pricing.freeTrial')} - {t('pricing.noPayment')}
            </p>
            <Link
              href="/signup"
              className="text-orange-600 font-semibold hover:text-orange-700 underline"
            >
              {t('pricing.freeTrial')} →
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA - Simple & Direct */}
      <section className="py-24 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center reveal">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 mb-6">
            {t('pricing.freeTrial')}
          </h2>
          <p className="text-lg text-zinc-600 mb-8">
            {t('pricing.freeTrialDesc')}<br />
            <strong className="text-zinc-900">{t('pricing.noPayment')}</strong>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="btn-shine px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl shadow-orange-500/30"
            >
              {t('hero.cta')} →
            </Link>
            <Link
              href="/login"
              className="btn-shine px-10 py-5 bg-white text-zinc-900 rounded-xl font-bold text-xl hover:bg-zinc-50 border-2 border-zinc-200"
            >
              {t('nav.login')}
            </Link>
          </div>
          <p className="text-sm text-zinc-500 mt-6">
            {t('pricing.freeTrial')} • {t('pricing.noPayment')}
          </p>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="bg-zinc-900 text-zinc-400 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold mb-3">{t('app.name')}</h3>
              <p className="text-sm">{t('app.tagline')}</p>
            </div>
            <div>
              <h3 className="text-white font-bold mb-3">{t('nav.features')}</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/features" className="hover:text-white transition-colors">All Features</Link></li>
                <li><Link href="/qr-menu-for-restaurants" className="hover:text-white transition-colors">QR Menu for Restaurants</Link></li>
                <li><Link href="/digital-menu-builder" className="hover:text-white transition-colors">Digital Menu Builder</Link></li>
                <li><Link href="/free-qr-menu" className="hover:text-white transition-colors">Free QR Menu</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-3">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white transition-colors">About Scaniha</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-3">{t('nav.language')}</h3>
              <div className="flex gap-4 mb-4">
                <LanguageSwitcher />
                <CurrencySelector />
              </div>
            </div>
          </div>
          <div className="border-t border-zinc-800 pt-6 text-center text-sm">
            <p className="mb-2">© 2024 {t('app.name')}. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Sticky mobile CTA */}
      <div className={`sticky-cta lg:hidden fixed bottom-0 inset-x-0 z-50 p-3 bg-white/90 backdrop-blur-md border-t border-zinc-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] ${showStickyCta ? 'show' : ''}`}>
        <Link
          href="/signup"
          className="btn-shine block w-full text-center px-6 py-4 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-lg shadow-lg shadow-orange-500/30"
        >
          {t('hero.cta')}
        </Link>
      </div>
    </div>
  )
}
