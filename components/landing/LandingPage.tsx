'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { useLocale, useTranslation } from '@/lib/i18n/LocaleContext'
import { createClient } from '@/lib/supabase/client'
import PricingComparison from '@/components/pricing/PricingComparison'
import ClientsSection from '@/components/landing/ClientsSection'
import AnimatedShapes from '@/components/landing/AnimatedShapes'
import LocalProductsSection from '@/components/landing/LocalProductsSection'
import FidelityShowcase from '@/components/landing/FidelityShowcase'
import PosShowcase from '@/components/landing/PosShowcase'
import logoIcon from '../../public/logo.png'
import logoFull from '../../public/logo2.webp'
import heroPhones from '../../public/hero/hero-phones.webp'
import fidCard from '../../public/landing/fidelity/card.webp'
import fidWheel from '../../public/landing/fidelity/wheel.webp'
import fidRewards from '../../public/landing/fidelity/rewards.webp'
import qrStands from '../../public/qr-stands.webp'
import feature1 from '../../public/features/feature-1.webp'
import feature2 from '../../public/features/feature-2.webp'
import feature3 from '../../public/features/feature-3.webp'
import feature4 from '../../public/features/feature-4.webp'

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

export default function LandingPage({ dashboardUrl }: { dashboardUrl?: string | null }) {
  const { t, locale, dir } = useLocale()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showStickyCta, setShowStickyCta] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const heroRef = useRef<HTMLElement | null>(null)
  // Hero promo rotator: 0 = Menu QR, 1 = Programme de fidélité.
  const [heroSlide, setHeroSlide] = useState(0)
  const [heroPaused, setHeroPaused] = useState(false)
  const [heroNudge, setHeroNudge] = useState(0) // bump → restarts the auto-rotate timer after a manual change
  const heroTouch = useRef<{ x: number; y: number } | null>(null)

  // Manual nav (dots + swipe): change the slide AND restart the auto-timer so it
  // doesn't jump again immediately after the user interacts.
  const goToSlide = (i: number) => { setHeroSlide(((i % 2) + 2) % 2); setHeroNudge((n) => n + 1) }
  const stepSlide = (d: number) => { setHeroSlide((s) => (s + d + 2) % 2); setHeroNudge((n) => n + 1) }
  const onHeroTouchStart = (e: React.TouchEvent) => { const t = e.touches[0]; heroTouch.current = { x: t.clientX, y: t.clientY } }
  const onHeroTouchEnd = (e: React.TouchEvent) => {
    const start = heroTouch.current
    heroTouch.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    // Horizontal swipe only (don't hijack vertical scroll).
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) stepSlide(dx < 0 ? 1 : -1)
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try { await createClient().auth.signOut() } catch {}
    window.location.href = '/'
  }

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

  // Auto-rotate the hero promo (paused on hover; off when reduced-motion).
  useEffect(() => {
    if (heroPaused) return
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return
    const id = setInterval(() => setHeroSlide((s) => (s + 1) % 2), 2500)
    return () => clearInterval(id)
  }, [heroPaused, heroNudge])

  return (
    <div className="landing min-h-screen bg-[#FEFEFE]" dir={dir}>
      {/* Header with Logo and Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-100 bg-[#FEFEFE]/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center" aria-label="Scaniha">
            <Image src={logoIcon} alt="Scaniha" className="h-9 w-auto" priority />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-8 lg:flex">
            <Link href="/" className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900">
              {t('nav.home')}
            </Link>
            <Link href="/features" className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900">
              {t('nav.features')}
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900">
              {t('nav.pricing')}
            </Link>
            <Link href="/blog" className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900">
              {t('nav.blog') || 'Blog'}
            </Link>
            <Link href="/about" className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900">
              {t('nav.about') || 'À propos'}
            </Link>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-1 lg:flex">
            {dashboardUrl ? (
              <>
                <Link
                  href={dashboardUrl}
                  className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                >
                  Mon espace
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 disabled:opacity-50"
                >
                  {loggingOut ? '…' : 'Déconnexion'}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900">
                  {t('nav.login')}
                </Link>
                <Link
                  href="/business-request"
                  className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                >
                  {t('nav.signup')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-zinc-700 hover:text-orange-600 transition-colors"
            aria-label="Ouvrir le menu"
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
          <div className="border-t border-zinc-100 bg-[#FEFEFE] lg:hidden">
            <nav className="mx-auto flex max-w-[1200px] flex-col px-4 py-3 sm:px-6">
              <Link href="/" className="rounded-lg px-2 py-2.5 text-base font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-orange-600" onClick={() => setMobileMenuOpen(false)}>
                {t('nav.home')}
              </Link>
              <Link href="/features" className="rounded-lg px-2 py-2.5 text-base font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-orange-600" onClick={() => setMobileMenuOpen(false)}>
                {t('nav.features')}
              </Link>
              <Link href="/pricing" className="rounded-lg px-2 py-2.5 text-base font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-orange-600" onClick={() => setMobileMenuOpen(false)}>
                {t('nav.pricing')}
              </Link>
              <Link href="/blog" className="rounded-lg px-2 py-2.5 text-base font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-orange-600" onClick={() => setMobileMenuOpen(false)}>
                {t('nav.blog') || 'Blog'}
              </Link>
              <Link href="/about" className="rounded-lg px-2 py-2.5 text-base font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-orange-600" onClick={() => setMobileMenuOpen(false)}>
                {t('nav.about') || 'À propos'}
              </Link>
              <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-4">
                {dashboardUrl ? (
                  <>
                    <Link href={dashboardUrl} className="rounded-lg bg-orange-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-orange-700" onClick={() => setMobileMenuOpen(false)}>
                      Mon espace
                    </Link>
                    <button type="button" onClick={() => { setMobileMenuOpen(false); handleLogout() }} disabled={loggingOut} className="rounded-lg border border-zinc-300 px-4 py-2.5 text-center text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50">
                      {loggingOut ? '…' : 'Déconnexion'}
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="rounded-lg border border-zinc-300 px-4 py-2.5 text-center text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50" onClick={() => setMobileMenuOpen(false)}>
                      {t('nav.login')}
                    </Link>
                    <Link href="/business-request" className="rounded-lg bg-orange-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-orange-700" onClick={() => setMobileMenuOpen(false)}>
                      {t('nav.signup')}
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main id="main-content">
      {/* Hero Section */}
      <section ref={heroRef} onTouchStart={onHeroTouchStart} onTouchEnd={onHeroTouchEnd} className="relative overflow-hidden bg-gradient-to-b from-[#FEFEFE] via-[#FEFEFE] to-[#FEFEFE]">
        {/* Decorations are desktop-only — mobile keeps a perfectly white hero */}
        <div className="hidden lg:block">
          <AnimatedShapes />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 left-[-15%] hidden h-[600px] w-[600px] rounded-full opacity-60 blur-[130px] lg:block"
          style={{ background: 'radial-gradient(circle, rgba(244,123,32,0.18), transparent 70%)' }}
        ></div>

        {/* Bright accent glow that shifts colour as the hero rotates */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className={`absolute -top-24 right-[-12%] h-[520px] w-[520px] rounded-full blur-[120px] transition-opacity duration-[1200ms] ${heroSlide === 0 ? 'opacity-70' : 'opacity-0'}`}
            style={{ background: 'radial-gradient(circle, rgba(244,123,32,0.22), transparent 70%)' }}
          />
          <div
            className={`absolute -top-24 right-[-12%] h-[520px] w-[520px] rounded-full blur-[120px] transition-opacity duration-[1200ms] ${heroSlide === 1 ? 'opacity-80' : 'opacity-0'}`}
            style={{ background: 'radial-gradient(circle, rgba(245,184,46,0.30), transparent 70%)' }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-[1240px] px-4 pb-10 pt-10 sm:px-6 lg:px-8 lg:pb-8 lg:pt-8">
          {/* Text — centered, image stacked below */}
          <div className="mx-auto max-w-3xl text-center">
            <div
              className="hero-up relative"
              style={{ ['--hero-delay' as string]: '0ms' }}
              onMouseEnter={() => setHeroPaused(true)}
              onMouseLeave={() => setHeroPaused(false)}
            >
              <div className="grid" aria-live="polite">
                {/* Slide 1 — Menu QR */}
                <div aria-hidden={heroSlide !== 0} className={`transition-all duration-700 ease-out [grid-area:1/1] ${heroSlide === 0 ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'}`}>
                  <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5">
                    <span aria-hidden="true">🍽️</span>
                    <span className="text-sm font-semibold text-orange-700">Menu QR</span>
                  </div>
                  <h1 className="headline mt-6 text-4xl font-extrabold leading-[1.08] text-zinc-900 sm:text-5xl lg:text-6xl">
                    Votre menu QR,<br />
                    <span className="text-orange-500">en un scan</span>
                  </h1>
                  <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-zinc-600">
                    <strong className="font-semibold text-zinc-800">Scaniha</strong> crée le menu QR de votre restaurant ou café — élégant, rapide, sans application, prêt en quelques minutes.
                  </p>
                </div>

                {/* Slide 2 — Programme de fidélité */}
                <div aria-hidden={heroSlide !== 1} className={`transition-all duration-700 ease-out [grid-area:1/1] ${heroSlide === 1 ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}>
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5">
                    <span aria-hidden="true">🎯</span>
                    <span className="text-sm font-semibold text-amber-700">Programme de fidélité</span>
                  </div>
                  <h2 className="headline mt-6 text-4xl font-extrabold leading-[1.08] text-zinc-900 sm:text-5xl lg:text-6xl">
                    Faites revenir<br />
                    <span className="text-orange-500">vos clients</span>
                  </h2>
                  <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-zinc-600">
                    Une carte de fidélité dans le téléphone : on s’inscrit en 10 secondes, on tourne la roue, on cumule des points et on les échange contre des récompenses.
                  </p>
                </div>
              </div>

              {/* Rotator dots */}
              <div className="mt-7 flex items-center justify-center gap-2.5">
                {[0, 1].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goToSlide(i)}
                    aria-label={i === 0 ? 'Voir le menu QR' : 'Voir le programme de fidélité'}
                    className={`h-2.5 rounded-full transition-all duration-500 ${heroSlide === i ? 'w-7 bg-orange-500' : 'w-2.5 bg-orange-200 hover:bg-orange-300'}`}
                  />
                ))}
              </div>
            </div>

            {/* CTA buttons — desktop */}
            <div className="hero-up mt-8 hidden justify-center gap-3 lg:flex" style={{ ['--hero-delay' as string]: '340ms' }}>
              {dashboardUrl ? (
                <Link
                  href={dashboardUrl}
                  className="btn-shine rounded-xl bg-orange-500 px-7 py-3.5 text-center text-base font-bold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600"
                >
                  Aller à mon espace
                </Link>
              ) : (
                <>
                  <Link
                    href="/business-request"
                    className="btn-shine rounded-xl bg-orange-500 px-7 py-3.5 text-center text-base font-bold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600"
                  >
                    Commencer l&apos;essai gratuit
                  </Link>
                  <Link
                    href="/login"
                    className="btn-shine rounded-xl border border-zinc-300 bg-[#FEFEFE] px-7 py-3.5 text-center text-base font-bold text-zinc-900 hover:bg-zinc-50"
                  >
                    Connexion
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Visual — under the text on every breakpoint */}
          <div className="hero-up mt-10 lg:mt-8" style={{ ['--hero-delay' as string]: '200ms' }}>
            <div className="relative mx-auto grid w-full max-w-[880px] place-items-center lg:max-w-[960px]">
              {/* Menu visual */}
              <div className={`relative w-full transition-all duration-700 ease-out [grid-area:1/1] ${heroSlide === 0 ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'}`}>
                <div className="hero-aura" aria-hidden="true">
                  <div className="rays" />
                  <div className="glow" />
                </div>
                <Image
                  src={heroPhones}
                  alt="Le menu numérique Scaniha affiché sur plusieurs smartphones"
                  sizes="(min-width: 1024px) 960px, 100vw"
                  priority
                  className="float-img relative z-10 mx-auto block h-auto w-full"
                />
              </div>
              {/* Fidélité visual — the 3 real screens (carte · roue · boutique) */}
              <div className={`relative flex w-full items-end justify-center gap-3 transition-all duration-700 ease-out [grid-area:1/1] sm:gap-5 ${heroSlide === 1 ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'}`}>
                <div className="hero-aura" aria-hidden="true">
                  <div className="rays" />
                  <div className="glow" />
                </div>
                {[{ src: fidCard, t: 'La carte' }, { src: fidWheel, t: 'La roue' }, { src: fidRewards, t: 'La boutique' }].map((p, i) => (
                  <div key={p.t} className={`relative z-10 w-[124px] sm:w-[178px] lg:w-[226px] ${i === 1 ? 'lg:-translate-y-7' : ''}`}>
                    <div className="float-img overflow-hidden rounded-[1.6rem] border border-zinc-200 bg-zinc-900 p-1.5 shadow-2xl shadow-orange-900/15" style={{ animationDelay: `${i * 1.2}s` }}>
                      <div className="aspect-[39/73] overflow-hidden rounded-[1.2rem] bg-white">
                        <Image src={p.src} alt={`${p.t} — programme de fidélité Scaniha`} sizes="184px" className="h-full w-full object-cover object-top" placeholder="blur" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* CTA buttons — mobile (side by side, under the image) */}
            <div className="mt-6 flex gap-3 lg:hidden">
              {dashboardUrl ? (
                <Link
                  href={dashboardUrl}
                  className="btn-shine flex-1 rounded-xl bg-orange-500 px-4 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600"
                >
                  Mon espace
                </Link>
              ) : (
                <>
                  <Link
                    href="/business-request"
                    className="btn-shine flex-1 rounded-xl bg-orange-500 px-4 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600"
                  >
                    Essai gratuit
                  </Link>
                  <Link
                    href="/login"
                    className="btn-shine flex-1 rounded-xl border border-zinc-300 bg-[#FEFEFE] px-4 py-3.5 text-center text-sm font-bold text-zinc-900 hover:bg-zinc-50"
                  >
                    Connexion
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* QR table stands — the physical product, right under the hero */}
      <section className="bg-white py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="reveal grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* QR stands photo */}
            <div className="flex justify-center">
              <Image
                src={qrStands}
                alt="Présentoirs QR Scaniha sur table — finitions aluminium, acrylique noir, bois clair et bois foncé"
                sizes="(min-width: 1024px) 560px, 100vw"
                className="h-auto w-full max-w-[560px]"
              />
            </div>

            {/* Copy */}
            <div className="text-center lg:text-left">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-500">Sur chaque table</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
                Un support, <span className="text-orange-500">deux QR codes</span>
              </h2>
              <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-zinc-600 lg:mx-0">
                Le menu d&apos;un côté, le Wi-Fi de l&apos;autre. Vos clients se connectent et commandent en deux scans —
                fini le « c&apos;est quoi le mot de passe ? ».
              </p>
              <ul className="mx-auto mt-6 max-w-md space-y-3 text-left lg:mx-0">
                <li className="flex items-start gap-3 text-zinc-700">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">1</span>
                  <span><strong className="text-zinc-900">QR menu</strong> — généré automatiquement avec votre compte.</span>
                </li>
                <li className="flex items-start gap-3 text-zinc-700">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">2</span>
                  <span><strong className="text-zinc-900">QR Wi-Fi</strong> — créez-le en 10 secondes depuis votre tableau de bord, le mot de passe reste chez vous.</span>
                </li>
                <li className="flex items-start gap-3 text-zinc-700">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">3</span>
                  <span><strong className="text-zinc-900">Support en bois ou acrylique</strong> — un par table, commandé avec votre abonnement.</span>
                </li>
              </ul>
              <Link
                href={dashboardUrl || '/business-request'}
                className="btn-shine mt-8 inline-block rounded-xl bg-orange-500 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600"
              >
                Équiper mes tables →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features - Fonctionnalités */}
      <section className="bg-white pt-16 pb-28 sm:pt-20 sm:pb-36 lg:pt-24 lg:pb-44">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="reveal mx-auto mb-12 max-w-2xl text-center sm:mb-16">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-500">
              Fonctionnalités
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl lg:text-5xl">
              Conçu pour Tous Vos Besoins
            </h2>
          </div>

          <div className="reveal grid grid-cols-1 items-start gap-14 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {[
              {
                src: feature1,
                n: '01',
                title: 'Menu QR instantané',
                desc: 'Vos clients scannent et découvrent votre menu en une seconde — sans application.',
              },
              {
                src: feature2,
                n: '02',
                title: 'Modifiez en temps réel',
                desc: 'Changez plats, prix et photos à tout moment — visible immédiatement par vos clients.',
              },
              {
                src: feature3,
                n: '03',
                title: 'Designs & statistiques',
                desc: '8 designs élégants et des statistiques de consultation pour votre restaurant.',
              },
              {
                src: feature4,
                n: '04',
                title: 'La roue de la chance',
                desc: 'Vos clients jouent et gagnent toujours quelque chose — un café, une remise, un dessert.',
              },
            ].map((f) => (
              <div key={f.n} className="mx-auto flex w-full max-w-md flex-col">
                <div className="flex items-end justify-center lg:h-[240px]">
                  <Image
                    src={f.src}
                    alt={f.title}
                    sizes="(min-width: 1024px) 300px, (min-width: 640px) 448px, 100vw"
                    className="mx-auto h-auto max-h-full w-full lg:w-auto"
                  />
                </div>
                <div className="mt-4 flex items-center gap-3 px-2">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-base font-extrabold text-orange-600">
                    {f.n}
                  </span>
                  <h3 className="text-xl font-extrabold tracking-tight text-zinc-900">{f.title}</h3>
                </div>
                <p className="mt-2 px-2 text-base leading-relaxed text-zinc-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Engagement — game + loyalty */}
      <section className="bg-[#FFF9F3] py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="reveal mx-auto mb-14 max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-500">Programme de fidélité</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
              Faites revenir vos clients
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-600">
              Une carte de fidélité dans le téléphone : on s’inscrit en 10 secondes, on tourne la roue, on cumule des points et on les échange contre des récompenses.
            </p>
          </div>

          <FidelityShowcase />
        </div>
      </section>

      {/* POS — the new standalone product */}
      <PosShowcase />

      {/* Our Clients - Trusted by */}
      <ClientsSection />

      {/* Pricing - Prominent & Clear */}
      <section className="relative overflow-hidden py-24 sm:py-28 lg:py-32 bg-gradient-to-b from-[#FEFEFE] via-[#FEFEFE] to-[#FEFEFE]">
        <AnimatedShapes />
        <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 mb-4">
              {t('pricing.title')}
            </h2>
            <p className="text-lg text-zinc-500">
              {t('pricing.subtitle')}
            </p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-sm font-medium text-zinc-600">
              <span className="text-orange-500" aria-hidden="true">✓</span>
              {t('pricing.freeTrial')} · {t('pricing.noPayment')}
            </p>
          </div>

          <div className="reveal">
            <PricingComparison />
          </div>
        </div>
      </section>

      {/* API & intégrations section hidden — still in test mode, not exposed to
          customers. Restore from git history when API access ships. */}

      {/* Final CTA - Simple & Direct */}
      <section className="py-24 sm:py-28 lg:py-32 bg-[#FEFEFE]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 reveal">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#F47B20] to-[#F5B82E] px-6 py-16 text-center shadow-2xl shadow-orange-500/25 sm:px-12">
            {/* Faint QR watermark for texture */}
            <svg
              aria-hidden="true"
              viewBox="0 0 100 100"
              className="pointer-events-none absolute -right-10 top-1/2 h-[125%] w-auto -translate-y-1/2 text-white opacity-[0.08]"
              fill="currentColor"
            >
              <path d="M8 8h28v28H8V8zm6 6v16h16V14H14zm4 4h8v8h-8v-8zM64 8h28v28H64V8zm6 6v16h16V14H70zm4 4h8v8h-8v-8zM8 64h28v28H8V64zm6 6v16h16V70H14zm4 4h8v8h-8v-8zM44 8h8v8h-8V8zm8 8h8v8h-8v-8zm-8 8h8v8h-8v-8zm8 8h8v8h-8v-8zm-8 8h8v8h-8v-8zM8 44h8v8H8v-8zm16 0h8v8h-8v-8zm16 0h8v8h-8v-8zm24 0h8v8h-8v-8zm16 0h8v8h-8v-8zm8 8h8v8h-8v-8zm-16 0h8v8h-8v-8zm-8 8h8v8h-8v-8zm16 0h8v8h-8v-8zm8 8h8v8h-8v-8zm-16 0h8v8h-8v-8zm-8 8h8v8h-8v-8zm16 8h8v8h-8v-8zm8-8h8v8h-8v-8zm8 8h8v8h-8v-8zm-40-8h8v8h-8v-8zm0 16h8v8h-8v-8z" />
            </svg>
            <h2 className="relative text-3xl font-extrabold text-white sm:text-5xl">
              Essai gratuit de 7 jours
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-lg text-white/90 sm:text-xl">
              Commencez votre essai gratuit aujourd&apos;hui. Aucun paiement requis.
            </p>
            <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {dashboardUrl ? (
                <Link
                  href={dashboardUrl}
                  className="btn-shine w-full rounded-xl bg-[#FEFEFE] px-8 py-4 text-base font-extrabold text-orange-600 shadow-lg hover:bg-white sm:w-auto"
                >
                  Aller à mon espace →
                </Link>
              ) : (
                <>
                  <Link
                    href="/business-request"
                    className="btn-shine w-full rounded-xl bg-[#FEFEFE] px-8 py-4 text-base font-extrabold text-orange-600 shadow-lg hover:bg-white sm:w-auto"
                  >
                    Démarrer l&apos;essai gratuit →
                  </Link>
                  <Link
                    href="/login"
                    className="w-full rounded-xl border border-white/50 px-8 py-4 text-base font-bold text-white transition-colors hover:bg-white/10 sm:w-auto"
                  >
                    Connexion
                  </Link>
                </>
              )}
            </div>
            <p className="relative mt-7 text-sm font-medium text-white/90">
              Rejoint par des restaurants et cafés en Tunisie 🇹🇳
            </p>
          </div>
        </div>
      </section>

      {/* Brand / SEO context — keyword-rich crawlable copy that anchors the
          "Scaniha" name to its niche (menu QR, café, restaurant, Tunisie). */}
      <section className="bg-[#FFF9F3] py-20 sm:py-24">
        <div className="reveal mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-500">Scaniha</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
              Le créateur de menu QR pensé pour la Tunisie
            </h2>
          </div>
          <div className="mt-8 space-y-5 text-lg leading-relaxed text-zinc-600">
            <p>
              <strong className="text-zinc-900">Scaniha</strong> est l&apos;application tunisienne qui transforme la carte
              de votre restaurant, café ou salon de thé en un <strong className="text-zinc-900">menu QR numérique</strong>{' '}
              élégant. Vos clients scannent le QR code posé sur la table et découvrent vos plats, boissons et desserts en une
              seconde — sans rien télécharger ni installer d&apos;application.
            </p>
            <p>
              Créer votre <strong className="text-zinc-900">menu en ligne</strong> prend quelques minutes : ajoutez vos
              catégories et vos articles, choisissez un design, puis générez votre <strong className="text-zinc-900">QR
              code</strong>. Modifiez vos prix et vos photos quand vous voulez — votre carte numérique se met à jour
              instantanément pour tous vos clients, sans réimpression.
            </p>
            <p>
              Au-delà du menu, <strong className="text-zinc-900">Scaniha</strong> fait revenir vos clients grâce à la roue
              de la chance et à un programme de points de fidélité. Un seul outil pour votre menu QR, votre QR Wi-Fi et
              l&apos;engagement de votre salle — conçu pour les cafés et restaurants en Tunisie, et entièrement en français.
            </p>
            <p>
              <strong className="text-zinc-900">Scaniha</strong> s&apos;écrit S-C-A-N-I-H-A (à ne pas confondre avec « Scania ») :
              c&apos;est la plateforme de <strong className="text-zinc-900">menu QR</strong> pour restaurants, cafés, salons de thé
              et food trucks en Tunisie. Menu QR gratuit à l&apos;essai, QR code de menu, carte numérique sans contact et menu
              digital en français — tout est centralisé dans votre espace <strong className="text-zinc-900">Scaniha</strong>.
            </p>
          </div>
        </div>
      </section>
      </main>

      {/* Local-only internal catalog — renders only under `next dev` with the
          gitignored public/_local-products.json present. Invisible in prod. */}
      <LocalProductsSection />

      {/* Simple Footer (kept dark — the footer logo is a light lockup) */}
      <footer className="bg-zinc-900 text-zinc-400 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              {/* logo2 is the light lockup (white lettering) — made for this dark footer */}
              <Image src={logoFull} alt="Scaniha — QR Menu Tool" className="h-20 w-auto" />
              <p className="mt-4 text-sm">{t('app.tagline')}</p>
              <p className="mt-2 text-sm text-zinc-500">Menus QR élégants pour restaurants et cafés.</p>
            </div>
            <div>
              <h3 className="text-white font-bold mb-3">{t('nav.features')}</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/features" className="hover:text-white transition-colors">Toutes les fonctionnalités</Link></li>
                <li><Link href="/qr-menu-for-restaurants" className="hover:text-white transition-colors">Menu QR pour restaurants</Link></li>
                <li><Link href="/digital-menu-builder" className="hover:text-white transition-colors">Créateur de menu numérique</Link></li>
                <li><Link href="/free-qr-menu" className="hover:text-white transition-colors">Menu QR gratuit</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-3">Entreprise</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white transition-colors">À propos de Scaniha</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Tarifs</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/security" className="hover:text-white transition-colors">Sécurité</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-3">Commencer</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/business-request" className="hover:text-white transition-colors">Créer un compte gratuit</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Connexion</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Nous contacter</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-zinc-800 pt-6 text-center text-sm">
            <div className="mb-4 flex items-center justify-center gap-3">
              <a
                href="https://www.instagram.com/scaniha.co/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Scaniha sur Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 transition hover:border-orange-500 hover:text-orange-500"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px]" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/61587286774228"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Scaniha sur Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 transition hover:border-orange-500 hover:text-orange-500"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden="true">
                  <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z" />
                </svg>
              </a>
            </div>
            <p className="mb-2">© {new Date().getFullYear()} {t('app.name')}. Tous droits réservés.</p>
          </div>
        </div>
      </footer>

      {/* Sticky mobile CTA */}
      <div className={`sticky-cta lg:hidden fixed bottom-0 inset-x-0 z-50 p-3 bg-[#FEFEFE]/90 backdrop-blur-md border-t border-zinc-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] ${showStickyCta ? 'show' : ''}`}>
        <Link
          href={dashboardUrl || '/business-request'}
          className="btn-shine block w-full text-center px-6 py-4 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-lg shadow-lg shadow-orange-500/30"
        >
          {dashboardUrl ? 'Aller à mon espace' : "Commencer l'essai gratuit"}
        </Link>
      </div>
    </div>
  )
}
