'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getProductMode } from '@/lib/design-settings'

interface OnboardingBusiness {
  id: string
  logo_url: string | null
  primary_color: string | null
  design_settings: any
}

interface Step {
  key: string
  title: string
  subtitle: string
  href: string
  done: boolean
}

const DISMISS_KEY = 'scaniha_onboarding_dismissed'

/**
 * First-run checklist shown on the /admin hub. Completion is computed from real
 * data (logo, categories, items, design, and whether the menu has been opened/
 * shared). It highlights the single next action, shows progress, hides itself
 * once everything is done, and can be dismissed. Mobile-first, brand-orange.
 */
export default function OnboardingChecklist({ business }: { business: OnboardingBusiness }) {
  const supabase = createClient()
  const [categoryCount, setCategoryCount] = useState(0)
  const [itemCount, setItemCount] = useState(0)
  const [gameOk, setGameOk] = useState(false)
  const [programOk, setProgramOk] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  // Tailor the steps to the café's product(s).
  const mode = getProductMode(business)
  const hasMenu = mode !== 'fidelity'
  const hasFidelity = mode === 'fidelity' || mode === 'both'

  useEffect(() => {
    setDismissed(typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1')
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        if (hasMenu) {
          const { data: cats } = await supabase.from('categories').select('id').eq('business_id', business.id)
          const catIds = (cats || []).map((c: any) => c.id)
          let items = 0
          if (catIds.length > 0) {
            const { count } = await (supabase.from('items') as any).select('id', { count: 'exact', head: true }).in('category_id', catIds)
            items = count ?? 0
          }
          if (active) { setCategoryCount(catIds.length); setItemCount(items) }
        }
        if (hasFidelity) {
          const { data: g } = await (supabase.from('games') as any).select('id').eq('business_id', business.id).eq('type', 'roulette').limit(1)
          const { data: p } = await (supabase.from('loyalty_programs') as any).select('business_id').eq('business_id', business.id).limit(1)
          if (active) { setGameOk((g?.length ?? 0) > 0); setProgramOk((p?.length ?? 0) > 0) }
        }
      } catch {
        /* leave counts/flags at defaults — steps simply show as not done */
      } finally {
        if (active) setLoaded(true)
      }
    })()
    return () => {
      active = false
    }
  }, [business.id, supabase, hasMenu, hasFidelity])

  const designChosen = useMemo(() => {
    const ds = business.design_settings
    const hasDesign = !!ds && typeof ds === 'object' && Object.keys(ds).length > 0
    return hasDesign || !!business.primary_color
  }, [business.design_settings, business.primary_color])

  const steps: Step[] = useMemo(() => {
    const logo: Step = { key: 'logo', title: 'Ajoutez votre logo', subtitle: 'Il s’affiche en haut de votre page', href: '/admin/settings', done: !!business.logo_url }
    const menuReady = itemCount > 0 && categoryCount > 0

    if (mode === 'fidelity') {
      return [
        logo,
        { key: 'design', title: 'Choisissez vos couleurs', subtitle: 'Style et couleur de votre carte', href: '/admin/theme', done: designChosen },
        { key: 'roue', title: 'Configurez la roue', subtitle: 'Lots et chances de gagner', href: '/admin/fidelite/roue', done: gameOk },
        { key: 'recompenses', title: 'Définissez les récompenses', subtitle: 'Points par dinar et catalogue', href: '/admin/fidelite/recompenses', done: programOk },
        { key: 'qr', title: 'Partagez votre QR code', subtitle: 'À imprimer pour vos tables', href: '/admin/share', done: gameOk },
      ]
    }

    const menuCore: Step[] = [
      logo,
      { key: 'category', title: 'Créez une première catégorie', subtitle: 'Ex. Boissons chaudes, Desserts', href: '/admin/menu', done: categoryCount > 0 },
      { key: 'item', title: 'Ajoutez un premier plat', subtitle: 'Nom, prix et photo', href: '/admin/menu', done: itemCount > 0 },
      { key: 'design', title: 'Choisissez un design', subtitle: 'Style et couleur de votre menu', href: '/admin/theme', done: designChosen },
    ]

    if (mode === 'both') {
      return [
        ...menuCore,
        { key: 'roue', title: 'Configurez la roue', subtitle: 'Lots et chances de gagner', href: '/admin/fidelite/roue', done: gameOk },
        { key: 'recompenses', title: 'Définissez les récompenses', subtitle: 'Points et catalogue', href: '/admin/fidelite/recompenses', done: programOk },
        { key: 'qr', title: 'Partagez votre QR code', subtitle: 'À imprimer pour vos tables', href: '/admin/share', done: menuReady },
      ]
    }

    return [
      ...menuCore,
      { key: 'qr', title: 'Partagez votre QR code', subtitle: 'À imprimer pour vos tables', href: '/admin/share', done: menuReady },
    ]
  }, [business.logo_url, categoryCount, itemCount, designChosen, gameOk, programOk, mode])

  const completed = steps.filter((s) => s.done).length
  const total = steps.length
  const allDone = completed === total
  const nextStep = steps.find((s) => !s.done)

  const headerTitle = mode === 'fidelity' ? 'Configurez votre fidélité' : mode === 'both' ? 'Configurez votre établissement' : 'Configurez votre menu'
  const headerSub = mode === 'fidelity' ? 'Quelques étapes pour lancer votre programme de fidélité.' : 'Quelques étapes pour tout mettre en ligne.'

  // Don't flash before data is loaded; hide when complete or dismissed.
  if (!loaded || dismissed || allDone) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-zinc-900">{headerTitle}</h2>
          <p className="mt-0.5 text-sm text-zinc-600">{headerSub}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Masquer le guide de démarrage"
          className="-mr-1 shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/60 hover:text-zinc-700"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-orange-500 transition-all"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-semibold text-orange-700" dir="ltr">
            {completed}/{total}
          </span>
        </div>
      </div>

      {/* Steps */}
      <ul className="space-y-2 px-3 pb-4">
        {steps.map((step) => {
          const isNext = !step.done && step.key === nextStep?.key
          return (
            <li key={step.key}>
              <Link
                href={step.href}
                aria-current={isNext ? 'step' : undefined}
                className={`flex items-center gap-3 rounded-xl border p-3 transition active:scale-[0.995] ${
                  step.done
                    ? 'border-transparent bg-white/50'
                    : isNext
                      ? 'border-orange-300 bg-white shadow-sm ring-1 ring-orange-200'
                      : 'border-transparent bg-white/50 hover:bg-white'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${
                    step.done ? 'bg-green-500 text-white' : isNext ? 'bg-orange-500 text-white' : 'bg-white text-zinc-400 ring-1 ring-zinc-200'
                  }`}
                  aria-hidden="true"
                >
                  {step.done ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : (
                    steps.indexOf(step) + 1
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold ${step.done ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>
                    {step.title}
                  </span>
                  {!step.done && <span className="block truncate text-xs text-zinc-500">{step.subtitle}</span>}
                </span>
                {isNext && (
                  <span className="shrink-0 rounded-full bg-orange-500 px-2.5 py-1 text-xs font-semibold text-white">
                    À faire
                  </span>
                )}
                {!step.done && !isNext && (
                  <svg className="shrink-0 text-zinc-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
