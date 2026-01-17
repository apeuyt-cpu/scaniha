'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Header with Logo and Navigation */}
      <header className="w-full py-4 px-4 sm:px-6 lg:px-8 border-b border-zinc-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
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
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          {/* Mobile Layout - Vertical Stack */}
          <div className="flex flex-col lg:hidden gap-6 w-full">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full border border-orange-200 w-fit">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-orange-700 text-sm font-medium">تجربة مجانية 7 أيام</span>
            </div>
            
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-zinc-900 text-right">
              قائمة رقمية<br />
              <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                احترافية
              </span>
              <br />
              في 5 دقائق
            </h1>
            
            {/* Image - Between headline and subheadline on mobile */}
            <div className="relative w-full">
              <div className="relative w-full aspect-[16/9] rounded-3xl overflow-hidden shadow-2xl">
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
            <p className="text-lg sm:text-xl text-zinc-600 leading-relaxed text-right">
              أنشئ قائمة QR لمطعمك أو مقهىك بسرعة وسهولة
              <br />
              <span className="text-zinc-500">بدون معرفة تقنية</span>
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/signup"
                className="group relative px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-bold text-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-center"
              >
                <span className="relative z-10">ابدأ الآن مجاناً</span>
                <span className="absolute inset-0 bg-gradient-to-r from-orange-700 to-amber-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></span>
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 bg-white text-zinc-900 rounded-xl font-semibold text-lg border-2 border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50 transition-all duration-300 text-center"
              >
                تسجيل الدخول
              </Link>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-6 pt-4 text-zinc-600 text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>لا حاجة لبطاقة ائتمانية</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>إلغاء في أي وقت</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>قابل للتخصيص بالكامل</span>
              </div>
            </div>
          </div>

          {/* Desktop Layout - Side by Side */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Text Content - Right Side (RTL) */}
            <div className="text-right space-y-6 w-full">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full border border-orange-200">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-orange-700 text-sm font-medium">تجربة مجانية 7 أيام</span>
              </div>
              
              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-zinc-900">
                قائمة رقمية<br />
                <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  احترافية
                </span>
                <br />
                في 5 دقائق
              </h1>
              
              {/* Subheadline */}
              <p className="text-lg sm:text-xl lg:text-2xl text-zinc-600 leading-relaxed">
                أنشئ قائمة QR لمطعمك أو مقهىك بسرعة وسهولة
                <br />
                <span className="text-zinc-500">بدون معرفة تقنية</span>
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/signup"
                  className="group relative px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-bold text-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-center"
                >
                  <span className="relative z-10">ابدأ الآن مجاناً</span>
                  <span className="absolute inset-0 bg-gradient-to-r from-orange-700 to-amber-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></span>
                </Link>
                <Link
                  href="/login"
                  className="px-8 py-4 bg-white text-zinc-900 rounded-xl font-semibold text-lg border-2 border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50 transition-all duration-300 text-center"
                >
                  تسجيل الدخول
                </Link>
              </div>
              
              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-6 pt-4 text-zinc-600 text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>لا حاجة لبطاقة ائتمانية</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>إلغاء في أي وقت</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>قابل للتخصيص بالكامل</span>
                </div>
              </div>
            </div>

            {/* Image Content - Left Side (RTL) */}
            <div className="relative w-full">
              <div className="relative w-full aspect-square max-w-lg mx-auto rounded-3xl overflow-hidden shadow-2xl">
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
      <section className="py-20 bg-gradient-to-b from-white to-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-4">
              ابدأ في 3 خطوات بسيطة
            </h2>
            <p className="text-lg text-zinc-600">
              سريع، سهل، وبأسعار منخفضة
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {/* Step 1 - Fast */}
            <div className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-zinc-100">
              {/* Step Number Badge */}
              <div className="absolute top-6 right-6 w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg z-10">
                1
              </div>
              
              {/* Image Container */}
              <div className="relative h-64 bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-8xl opacity-20">⚡</div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent"></div>
              </div>
              
              {/* Content */}
              <div className="p-8 text-right">
                <h3 className="text-2xl font-bold text-zinc-900 mb-3">سريع جداً</h3>
                <p className="text-zinc-600 leading-relaxed text-base">
                  أنشئ قائمتك في أقل من 5 دقائق. لا حاجة للمعرفة التقنية.
                </p>
              </div>
            </div>

            {/* Step 2 - Low Prices */}
            <div className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-zinc-100">
              {/* Step Number Badge */}
              <div className="absolute top-6 right-6 w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg z-10">
                2
              </div>
              
              {/* Image Container */}
              <div className="relative h-64 bg-gradient-to-br from-green-50 to-emerald-50 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-8xl opacity-20">💰</div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent"></div>
              </div>
              
              {/* Content */}
              <div className="p-8 text-right">
                <h3 className="text-2xl font-bold text-zinc-900 mb-3">أسعار منخفضة</h3>
                <p className="text-zinc-600 leading-relaxed text-base">
                  70 د.ت لـ 6 أشهر أو 100 د.ت للسنة الكاملة. بدون رسوم خفية.
                </p>
              </div>
            </div>

            {/* Step 3 - Easy Updates */}
            <div className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-zinc-100">
              {/* Step Number Badge */}
              <div className="absolute top-6 right-6 w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg z-10">
                3
              </div>
              
              {/* Image Container */}
              <div className="relative h-64 bg-gradient-to-br from-purple-50 to-pink-50 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-8xl opacity-20">✨</div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent"></div>
              </div>
              
              {/* Content */}
              <div className="p-8 text-right">
                <h3 className="text-2xl font-bold text-zinc-900 mb-3">سهل التحديث</h3>
                <p className="text-zinc-600 leading-relaxed text-base">
                  عدّل الأسعار والأطباق في أي وقت. التحديثات فورية.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing - Prominent & Clear */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-4">
              خطط بأسعار لا تقبل المنافسة
            </h2>
            <p className="text-lg text-zinc-600">
              اختر ما يناسبك. كل الخطط تشمل كل المميزات
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-12">
            {/* Plan 1 */}
            <div className="bg-white border-2 border-zinc-200 rounded-2xl p-8 hover:border-orange-500 transition-all">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-zinc-900 mb-2">6 أشهر</h3>
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl font-bold text-zinc-900">70</span>
                  <span className="text-xl text-zinc-600">د.ت</span>
                </div>
                <p className="text-sm text-zinc-500">≈ 11.67 د.ت / شهر</p>
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
                href="/signup"
                className="block w-full text-center px-6 py-4 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-colors"
              >
                ابدأ الآن →
              </Link>
            </div>

            {/* Plan 2 - Popular */}
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-2xl p-8 shadow-2xl transform scale-105 border-4 border-orange-400">
              <div className="text-center mb-2">
                <span className="inline-block bg-white text-orange-600 px-4 py-1 rounded-full text-sm font-bold mb-4">
                  الأكثر شعبية
                </span>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">سنة كاملة</h3>
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl font-bold">100</span>
                  <span className="text-xl text-white/90">د.ت</span>
                </div>
                <p className="text-sm text-white/90">≈ 8.33 د.ت / شهر</p>
                <p className="text-sm mt-2 text-yellow-200 font-semibold">توفر 40 د.ت!</p>
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
                href="/signup"
                className="block w-full text-center px-6 py-4 bg-white text-orange-600 rounded-xl font-semibold hover:bg-zinc-50 transition-colors"
              >
                ابدأ الآن →
              </Link>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="text-center mb-8">
            <p className="text-xl font-semibold text-zinc-900 mb-6">طرق الدفع المتاحة:</p>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {/* Flouci */}
              <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-xl border-2 border-zinc-200 shadow-md hover:shadow-lg transition-shadow">
                <Image
                  src="https://805342.fs1.hubspotusercontent-na1.net/hubfs/805342/flouci_logo_new.png"
                  alt="Flouci"
                  width={120}
                  height={45}
                  className="object-contain h-12"
                />
              </div>
              
              {/* D17 */}
              <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-xl border-2 border-zinc-200 shadow-md hover:shadow-lg transition-shadow">
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
              <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-xl border-2 border-zinc-200 shadow-md hover:shadow-lg transition-shadow">
                <svg className="w-12 h-12 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="text-zinc-900 font-bold text-lg">تحويل بنكي</span>
              </div>
            </div>
          </div>

          <div className="text-center">
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
      <section className="py-20 bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-6">
            جاهز للبدء؟
          </h2>
          <p className="text-lg text-zinc-600 mb-8">
            أنشئ قائمتك الرقمية الآن. لا حاجة لبطاقة ائتمانية.<br />
            <strong className="text-zinc-900">ابدأ مجاناً واستكشف كل المميزات.</strong>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-10 py-5 bg-orange-600 text-white rounded-xl font-bold text-xl hover:bg-orange-700 transition-colors shadow-xl"
            >
              ابدأ مجاناً الآن →
            </Link>
            <Link
              href="/login"
              className="px-10 py-5 bg-white text-zinc-900 rounded-xl font-bold text-xl hover:bg-zinc-50 transition-colors border-2 border-zinc-200"
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
    </div>
  )
}
