'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'

// Scroll-reveal: adds .is-visible to .reveal elements as they enter the viewport
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

const trustItems = ['لا حاجة لبطاقة ائتمانية', 'إلغاء في أي وقت', 'قابل للتخصيص بالكامل']

function TrustBadges() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 text-zinc-700 text-sm reveal">
      {trustItems.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="rgba(22,163,74,0.12)" />
            <path
              className="check-draw"
              style={{ ['--check-delay' as string]: `${200 + i * 120}ms` }}
              d="M7 12.5l3 3 7-7"
              stroke="#16a34a"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

export default function LandingPage() {
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
    <div className="landing min-h-screen" dir="rtl">
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
          <nav className="hidden lg:flex items-center gap-8">
            <Link href="/" className="text-zinc-700 hover:text-orange-600 font-medium transition-colors">
              الرئيسية
            </Link>
            <Link href="/signup" className="text-zinc-700 hover:text-orange-600 font-medium transition-colors">
              إنشاء حساب
            </Link>
            <Link
              href="/login"
              className="px-6 py-2 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-800 transition-colors"
            >
              تسجيل الدخول
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
              <Link
                href="/"
                className="text-zinc-700 hover:text-orange-600 font-medium transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                الرئيسية
              </Link>
              <Link
                href="/signup"
                className="text-zinc-700 hover:text-orange-600 font-medium transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                إنشاء حساب
              </Link>
              <Link
                href="/login"
                className="px-6 py-2 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-800 transition-colors text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                تسجيل الدخول
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
              <span className="text-orange-700 text-sm font-bold">تجربة مجانية 7 أيام</span>
            </div>

            {/* Main Headline */}
            <h1 className="hero-up headline text-4xl sm:text-5xl font-extrabold text-zinc-900 text-right" style={{ ['--hero-delay' as string]: '120ms' }}>
              قائمة رقمية<br />
              <span className="grad-text">احترافية</span>
              <br />
              في 5 دقائق
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
            <p className="hero-up text-lg sm:text-xl text-zinc-600 leading-relaxed text-right" style={{ ['--hero-delay' as string]: '320ms' }}>
              أنشئ قائمة QR لمطعمك أو مقهىك بسرعة وسهولة
              <br />
              <span className="text-zinc-500">بدون معرفة تقنية</span>
            </p>

            {/* CTA Buttons */}
            <div className="hero-up flex flex-col sm:flex-row gap-4 pt-4" style={{ ['--hero-delay' as string]: '400ms' }}>
              <Link
                href="/signup"
                className="btn-shine px-8 py-4 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-lg shadow-lg shadow-orange-500/30 text-center"
              >
                ابدأ الآن مجاناً
              </Link>
              <Link
                href="/login"
                className="btn-shine px-8 py-4 bg-white text-zinc-900 rounded-xl font-semibold text-lg border-2 border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50 text-center"
              >
                تسجيل الدخول
              </Link>
            </div>

            {/* Trust Indicators */}
            <TrustBadges />
          </div>

          {/* Desktop Layout - Side by Side */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Text Content - Right Side (RTL) */}
            <div className="text-right space-y-6 w-full">
              {/* Badge */}
              <div className="hero-up glass-pill inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ ['--hero-delay' as string]: '0ms' }}>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-orange-700 text-sm font-bold">تجربة مجانية 7 أيام</span>
              </div>

              {/* Main Headline */}
              <h1 className="hero-up headline text-4xl sm:text-5xl lg:text-6xl font-extrabold text-zinc-900" style={{ ['--hero-delay' as string]: '120ms' }}>
                قائمة رقمية<br />
                <span className="grad-text">احترافية</span>
                <br />
                في 5 دقائق
              </h1>

              {/* Subheadline */}
              <p className="hero-up text-lg sm:text-xl lg:text-2xl text-zinc-600 leading-relaxed" style={{ ['--hero-delay' as string]: '240ms' }}>
                أنشئ قائمة QR لمطعمك أو مقهىك بسرعة وسهولة
                <br />
                <span className="text-zinc-500">بدون معرفة تقنية</span>
              </p>

              {/* CTA Buttons */}
              <div className="hero-up flex flex-col sm:flex-row gap-4 pt-4" style={{ ['--hero-delay' as string]: '340ms' }}>
                <Link
                  href="/signup"
                  className="btn-shine px-8 py-4 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-lg shadow-lg shadow-orange-500/30 text-center"
                >
                  ابدأ الآن مجاناً
                </Link>
                <Link
                  href="/login"
                  className="btn-shine px-8 py-4 bg-white text-zinc-900 rounded-xl font-semibold text-lg border-2 border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50 text-center"
                >
                  تسجيل الدخول
                </Link>
              </div>

              {/* Trust Indicators */}
              <TrustBadges />
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

      {/* Value Props - Quick Benefits - 3 Steps */}
      <section className="py-24 bg-gradient-to-b from-white to-[#FAFAF8]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 mb-4">
              ابدأ في 3 خطوات بسيطة
            </h2>
            <p className="text-lg text-zinc-600">
              سريع، سهل، وبأسعار منخفضة
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
            {/* Step 1 - Fast */}
            <div className="reveal lp-card group relative overflow-hidden" style={{ ['--reveal-delay' as string]: '0ms' }}>
              <div className="badge-pop absolute top-6 right-6 w-12 h-12 bg-gradient-to-br from-[#F47B20] to-[#F5B82E] rounded-full flex items-center justify-center text-white font-extrabold text-xl shadow-lg z-10">
                1
              </div>
              <div className="relative h-64 bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="step-icon text-8xl opacity-25">⚡</div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent"></div>
              </div>
              <div className="p-8 text-right">
                <h3 className="text-2xl font-extrabold text-zinc-900 mb-3">سريع جداً</h3>
                <p className="text-zinc-600 leading-relaxed text-base">
                  أنشئ قائمتك في أقل من 5 دقائق. لا حاجة للمعرفة التقنية.
                </p>
              </div>
            </div>

            {/* Step 2 - Low Prices */}
            <div className="reveal lp-card group relative overflow-hidden" style={{ ['--reveal-delay' as string]: '80ms' }}>
              <div className="badge-pop absolute top-6 right-6 w-12 h-12 bg-gradient-to-br from-[#F47B20] to-[#F5B82E] rounded-full flex items-center justify-center text-white font-extrabold text-xl shadow-lg z-10">
                2
              </div>
              <div className="relative h-64 bg-gradient-to-br from-green-50 to-emerald-50 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="step-icon text-8xl opacity-25">💰</div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent"></div>
              </div>
              <div className="p-8 text-right">
                <h3 className="text-2xl font-extrabold text-zinc-900 mb-3">أسعار منخفضة</h3>
                <p className="text-zinc-600 leading-relaxed text-base">
                  150 د.ت لـ 6 أشهر أو 250 د.ت للسنة الكاملة أو 600 د.ت مدى الحياة. بدون رسوم خفية.
                </p>
              </div>
            </div>

            {/* Step 3 - Easy Updates */}
            <div className="reveal lp-card group relative overflow-hidden" style={{ ['--reveal-delay' as string]: '160ms' }}>
              <div className="badge-pop absolute top-6 right-6 w-12 h-12 bg-gradient-to-br from-[#F47B20] to-[#F5B82E] rounded-full flex items-center justify-center text-white font-extrabold text-xl shadow-lg z-10">
                3
              </div>
              <div className="relative h-64 bg-gradient-to-br from-purple-50 to-pink-50 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="step-icon text-8xl opacity-25">✨</div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent"></div>
              </div>
              <div className="p-8 text-right">
                <h3 className="text-2xl font-extrabold text-zinc-900 mb-3">سهل التحديث</h3>
                <p className="text-zinc-600 leading-relaxed text-base">
                  عدّل الأسعار والأطباق في أي وقت. التحديثات فورية.
                </p>
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
              خطط بأسعار لا تقبل المنافسة
            </h2>
            <p className="text-lg text-zinc-600">
              اختر ما يناسبك. كل الخطط تشمل كل المميزات
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-14 items-center">
            {/* Plan 1 */}
            <div className="reveal lp-card md:scale-95 md:opacity-90 p-8" style={{ ['--reveal-delay' as string]: '0ms' }}>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-extrabold text-zinc-900 mb-2">6 أشهر</h3>
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl font-extrabold text-zinc-900">150</span>
                  <span className="text-xl text-zinc-600">د.ت</span>
                </div>
                <p className="text-sm text-zinc-500">≈ 25 د.ت / شهر</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-zinc-700">قائمة QR احترافية</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-zinc-700">عدد غير محدود من الأطباق</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-zinc-700">تصاميم جاهزة</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-zinc-700">دعم فني</span>
                </li>
              </ul>
              <Link
                href="/signup?plan=6months"
                className="btn-shine block w-full text-center px-6 py-4 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800"
              >
                ابدأ الآن →
              </Link>
            </div>

            {/* Plan 2 - Popular */}
            <div className="reveal pulse-glow relative bg-gradient-to-br from-[#F47B20] to-[#F5B82E] text-white rounded-2xl p-8 md:scale-105 z-10 border border-white/20" style={{ ['--reveal-delay' as string]: '80ms' }}>
              <div className="text-center mb-2">
                <span className="inline-block bg-white text-orange-600 px-4 py-1 rounded-full text-sm font-extrabold mb-4 shadow">
                  الأكثر شعبية
                </span>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-extrabold mb-2">سنة كاملة</h3>
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl font-extrabold">250</span>
                  <span className="text-xl text-white/90">د.ت</span>
                </div>
                <p className="text-sm text-white/90">≈ 20.83 د.ت / شهر</p>
                <p className="text-sm mt-2 text-yellow-100 font-semibold">توفر 50 د.ت!</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-white text-xl">✓</span>
                  <span>كل ما في خطة 6 أشهر</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-white text-xl">✓</span>
                  <span>دعم أولوية</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-white text-xl">✓</span>
                  <span>تحديثات مجانية</span>
                </li>
              </ul>
              <Link
                href="/signup?plan=1year"
                className="btn-shine block w-full text-center px-6 py-4 bg-white text-orange-600 rounded-xl font-extrabold hover:bg-zinc-50"
              >
                ابدأ الآن →
              </Link>
            </div>

            {/* Plan 3 - Lifetime */}
            <div className="reveal lp-card md:scale-95 md:opacity-95 bg-gradient-to-br from-zinc-800 to-zinc-900 text-white p-8 border border-amber-400/40" style={{ ['--reveal-delay' as string]: '160ms' }}>
              <div className="text-center mb-2">
                <span className="inline-block bg-amber-400 text-zinc-900 px-4 py-1 rounded-full text-sm font-extrabold mb-4">
                  الأفضل
                </span>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-extrabold mb-2">مدى الحياة</h3>
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl font-extrabold">600</span>
                  <span className="text-xl text-white/90">د.ت</span>
                </div>
                <p className="text-sm text-white/90">دفعة واحدة</p>
                <p className="text-sm mt-2 text-amber-300 font-semibold">وفر أكثر من 300 د.ت!</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-amber-400 text-xl">✓</span>
                  <span>كل ما في خطة سنة كاملة</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-400 text-xl">✓</span>
                  <span>مميزات حصرية</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-400 text-xl">✓</span>
                  <span>دعم مميز على مدار الساعة</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-400 text-xl">✓</span>
                  <span>تحديثات مدى الحياة</span>
                </li>
              </ul>
              <Link
                href="/signup?plan=lifetime"
                className="btn-shine block w-full text-center px-6 py-4 bg-amber-400 text-zinc-900 rounded-xl font-extrabold hover:bg-amber-300"
              >
                ابدأ الآن →
              </Link>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="text-center mb-8 reveal">
            <p className="text-xl font-bold text-zinc-900 mb-6">طرق الدفع المتاحة:</p>
            <div className="marquee">
              <div className="marquee-track py-2">
                {[0, 1].map((dup) => (
                  <div key={dup} className="flex items-center gap-8 shrink-0" aria-hidden={dup === 1}>
                    {/* Flouci */}
                    <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-xl border border-zinc-200 shadow-md hover:shadow-lg transition-shadow">
                      <Image
                        src="https://805342.fs1.hubspotusercontent-na1.net/hubfs/805342/flouci_logo_new.png"
                        alt="Flouci"
                        width={120}
                        height={45}
                        className="object-contain h-12"
                      />
                    </div>
                    {/* D17 */}
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
                    {/* Bank Transfer */}
                    <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-xl border border-zinc-200 shadow-md hover:shadow-lg transition-shadow">
                      <svg className="w-12 h-12 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span className="text-zinc-900 font-bold text-lg">تحويل بنكي</span>
                    </div>
                    {/* Dodo Payments */}
                    <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-xl border border-zinc-200 shadow-md hover:shadow-lg transition-shadow">
                      <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none">
                        <rect width="40" height="40" rx="8" fill="#7C3AED" />
                        <path d="M12 20L18 14L24 20L18 26L12 20Z" fill="white" opacity="0.9" />
                        <path d="M18 14L24 20L18 26" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="text-zinc-900 font-bold text-lg">Dodo Payments</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center reveal">
            <p className="text-zinc-600 mb-4">
              جميع الخطط تشمل تجربة مجانية 7 أيام
            </p>
            <Link
              href="/signup"
              className="text-orange-600 font-semibold hover:text-orange-700 underline"
            >
              ابدأ تجربتك المجانية →
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA - Simple & Direct */}
      <section className="py-24 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center reveal">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 mb-6">
            جاهز للبدء؟
          </h2>
          <p className="text-lg text-zinc-600 mb-8">
            أنشئ قائمتك الرقمية الآن. لا حاجة لبطاقة ائتمانية.<br />
            <strong className="text-zinc-900">ابدأ مجاناً واستكشف كل المميزات.</strong>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="btn-shine px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl shadow-orange-500/30"
            >
              ابدأ مجاناً الآن →
            </Link>
            <Link
              href="/login"
              className="btn-shine px-10 py-5 bg-white text-zinc-900 rounded-xl font-bold text-xl hover:bg-zinc-50 border-2 border-zinc-200"
            >
              تسجيل الدخول
            </Link>
          </div>
          <p className="text-sm text-zinc-500 mt-6">
            تجربة مجانية 7 أيام • بدون التزام • إلغاء في أي وقت
          </p>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="bg-zinc-900 text-zinc-400 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="mb-2">© 2024 Scaniha. جميع الحقوق محفوظة.</p>
            <div className="flex justify-center gap-6 text-sm">
              <Link href="/login" className="hover:text-white transition-colors">تسجيل الدخول</Link>
              <Link href="/signup" className="hover:text-white transition-colors">إنشاء حساب</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Sticky mobile CTA */}
      <div className={`sticky-cta lg:hidden fixed bottom-0 inset-x-0 z-50 p-3 bg-white/90 backdrop-blur-md border-t border-zinc-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] ${showStickyCta ? 'show' : ''}`}>
        <Link
          href="/signup"
          className="btn-shine block w-full text-center px-6 py-4 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-lg shadow-lg shadow-orange-500/30"
        >
          ابدأ الآن مجاناً
        </Link>
      </div>
    </div>
  )
}
