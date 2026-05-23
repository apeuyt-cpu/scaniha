'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

type BillingCycle = 'monthly' | 'yearly'
type PlanId = 'starter' | 'team' | 'lifetime'

const features = [
  'Project & task management',
  'Client portal',
  'AI assistant & automation',
  'Finance & payroll modules',
  'Enterprise operations',
  'Social media manager',
  'Contract management',
  'Volume discount (50+ seats)',
  'Dedicated onboarding',
  'SLA support',
  'All future updates',
]

const featureMatrix: Record<PlanId, boolean[]> = {
  starter: [true, true, true, true, true, true, true, false, false, false, false],
  team: [true, true, true, true, true, true, true, true, true, true, false],
  lifetime: [true, true, true, true, true, true, true, true, true, true, true],
}

function CheckIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.08 7.14a1 1 0 0 1-1.424-.006L3.29 8.77a1 1 0 1 1 1.42-1.41l4.206 4.34 6.374-6.424a1 1 0 0 1 1.414-.006Z" clipRule="evenodd" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  )
}

function SeatStepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number
  min: number
  max?: number
  onChange: (value: number) => void
}) {
  const decrement = () => onChange(Math.max(min, value - 1))
  const increment = () => onChange(max ? Math.min(max, value + 1) : value + 1)

  return (
    <div className="grid grid-cols-[44px_1fr_44px] h-12 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={decrement}
        disabled={value <= min}
        className="flex items-center justify-center border-r border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
        aria-label="Decrease seats"
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M4 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" />
        </svg>
      </button>
      <div className="flex items-center justify-center text-base font-semibold text-slate-950">{value}</div>
      <button
        type="button"
        onClick={increment}
        disabled={Boolean(max && value >= max)}
        className="flex items-center justify-center border-l border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
        aria-label="Increase seats"
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
      </button>
    </div>
  )
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}

export default function PricingPage() {
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const [starterSeats, setStarterSeats] = useState(5)
  const [teamSeats, setTeamSeats] = useState(50)
  const [lifetimeSeats, setLifetimeSeats] = useState(5)

  const yearlyDiscount = cycle === 'yearly' ? 10 : 1
  const periodLabel = cycle === 'yearly' ? 'year' : 'month'

  const totals = useMemo(() => {
    return {
      starter: starterSeats * 3 * yearlyDiscount,
      team: teamSeats * 2.5 * yearlyDiscount,
      lifetime: lifetimeSeats * 99,
    }
  }, [lifetimeSeats, starterSeats, teamSeats, yearlyDiscount])

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8 lg:py-16">
          <div className="max-w-3xl">
            <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 1.06L5.56 9.25h10.69A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
              </svg>
              Back to home
            </Link>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-orange-600">Transparent, seat-based pricing</p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Choose your plan</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              No hidden fees. No long-term contracts. Cancel or change plans anytime.
            </p>
          </div>

          <div className="self-end rounded-xl border border-slate-200 bg-slate-50 p-1">
            <div className="grid grid-cols-2 gap-1">
              {(['monthly', 'yearly'] as BillingCycle[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCycle(item)}
                  className={`rounded-lg px-5 py-3 text-sm font-semibold capitalize transition ${
                    cycle === item ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-950'
                  }`}
                >
                  {item}
                  {item === 'yearly' && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Save 17%</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-bold">Starter</h2>
              <p className="mt-1 text-sm text-slate-500">For small teams</p>
              <div className="mt-6 flex items-end gap-1">
                <span className="text-5xl font-bold">$3</span>
                <span className="pb-2 text-sm font-medium text-slate-500">/seat/mo</span>
              </div>
            </div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Seats (max 49)</label>
            <SeatStepper value={starterSeats} min={1} max={49} onChange={setStarterSeats} />
            <div className="my-6 rounded-lg bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Total</span>
                <span>{cycle === 'yearly' ? 'Billed yearly' : 'Billed monthly'}</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{formatMoney(totals.starter)}/{periodLabel}</p>
            </div>
            <ul className="mb-6 space-y-3 text-sm text-slate-700">
              {['All core modules', 'Project & task management', 'Client portal', 'AI assistant', 'Up to 49 seats'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup" className="block rounded-lg border border-slate-300 px-5 py-3 text-center text-sm font-bold text-slate-950 transition hover:border-slate-950 hover:bg-slate-50">
              Get Started
            </Link>
          </article>

          <article className="relative rounded-xl border-2 border-slate-950 bg-white p-6 shadow-xl">
            <div className="absolute right-5 top-5 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">Most Popular</div>
            <div className="mb-6">
              <h2 className="text-xl font-bold">Team</h2>
              <p className="mt-1 text-sm text-slate-500">For growing agencies</p>
              <div className="mt-6 flex items-end gap-1">
                <span className="text-5xl font-bold">$2.5</span>
                <span className="pb-2 text-sm font-medium text-slate-500">/seat/mo</span>
              </div>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">Volume discount</p>
            </div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Seats (min 50)</label>
            <SeatStepper value={teamSeats} min={50} onChange={setTeamSeats} />
            <div className="my-6 rounded-lg bg-slate-950 p-4 text-white">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Total</span>
                <span>{cycle === 'yearly' ? 'Billed yearly' : 'Billed monthly'}</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{formatMoney(totals.team)}/{periodLabel}</p>
            </div>
            <ul className="mb-6 space-y-3 text-sm text-slate-700">
              {['Everything in Starter', '50+ seats included', 'Volume discount', 'Dedicated onboarding', 'SLA support'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup" className="block rounded-lg bg-slate-950 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-slate-800">
              Get Started
            </Link>
          </article>

          <article className="rounded-xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-bold">Lifetime</h2>
              <p className="mt-1 text-sm text-slate-300">Pay once, use forever</p>
              <div className="mt-6 flex items-end gap-1">
                <span className="text-5xl font-bold">$99</span>
                <span className="pb-2 text-sm font-medium text-slate-300">/seat</span>
              </div>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-orange-300">One-time</p>
            </div>
            <label className="mb-2 block text-sm font-semibold text-slate-200">Seats</label>
            <SeatStepper value={lifetimeSeats} min={1} onChange={setLifetimeSeats} />
            <div className="my-6 rounded-lg bg-white/10 p-4">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Total (one-time)</span>
                <span>No renewal</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{formatMoney(totals.lifetime)} forever</p>
            </div>
            <ul className="mb-6 space-y-3 text-sm text-slate-200">
              {['Everything forever', 'No recurring fees', 'All future updates', 'Lifetime support', 'Priority feature requests'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 shrink-0 text-orange-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup?plan=lifetime" className="block rounded-lg bg-white px-5 py-3 text-center text-sm font-bold text-slate-950 transition hover:bg-orange-100">
              Get Lifetime Access
            </Link>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-2xl font-bold">Full feature comparison</h2>
            <p className="mt-2 text-sm text-slate-500">Every plan includes all core modules.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-bold">Feature</th>
                  <th className="px-6 py-4 text-center font-bold">Starter</th>
                  <th className="px-6 py-4 text-center font-bold">Team <span className="ml-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] text-orange-700">Popular</span></th>
                  <th className="px-6 py-4 text-center font-bold">Lifetime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {features.map((feature, index) => (
                  <tr key={feature}>
                    <td className="px-6 py-4 font-medium text-slate-800">{feature}</td>
                    {(['starter', 'team', 'lifetime'] as PlanId[]).map((plan) => (
                      <td key={plan} className="px-6 py-4">
                        <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full ${
                          featureMatrix[plan][index] ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-300'
                        }`}>
                          {featureMatrix[plan][index] ? <CheckIcon className="w-4 h-4" /> : <XIcon />}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-600 shadow-sm sm:grid-cols-3">
          {['Secure checkout', '30-day money-back guarantee', 'Cancel anytime, no lock-in'].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <CheckIcon className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
