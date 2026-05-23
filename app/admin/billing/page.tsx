'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

interface Business {
  id: string
  name: string
  status: 'active' | 'paused' | 'pending'
  expires_at: string | null
}

function formatDate(value: string | null) {
  if (!value) return 'Not set'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  )
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.08 7.14a1 1 0 0 1-1.424-.006L3.29 8.77a1 1 0 1 1 1.42-1.41l4.206 4.34 6.374-6.424a1 1 0 0 1 1.414-.006Z" clipRule="evenodd" />
    </svg>
  )
}

export default function BillingPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadBusiness() {
      try {
        const response = await fetch('/api/admin/business')
        if (!response.ok) return
        const data = await response.json()
        if (mounted) setBusiness(data)
      } catch (error) {
        console.error('Unable to load billing business data:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadBusiness()

    return () => {
      mounted = false
    }
  }, [])

  const planStatus = useMemo(() => {
    if (!business) return 'Free Trial'
    if (business.status === 'pending') return 'Payment pending'
    if (business.status === 'paused') return 'Paused'
    return 'Free Trial'
  }, [business])

  const isTrialActive = business?.status === 'active'

  return (
    <div className="admin-page min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8" dir="ltr">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-600">Account billing</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Billing & Subscription</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Manage your plan, seats, and payment details from one clean workspace.
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            Upgrade Plan
          </Link>
        </div>

        <section className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="border-b border-slate-200 p-6 lg:border-b-0 lg:border-r">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {planStatus}
                  </div>
                  <h2 className="mt-5 text-2xl font-bold">Free Trial</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                    Your workspace is currently on a trial plan. Upgrade when you are ready to unlock paid billing and keep access active.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <span className="block font-semibold text-slate-950">{business?.name || 'Workspace'}</span>
                  {loading ? 'Loading subscription...' : isTrialActive ? 'Trial access enabled' : 'Review subscription status'}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                    <CheckIcon />
                  </span>
                  Core modules included
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                    <CheckIcon />
                  </span>
                  No payment method required
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                    <CheckIcon />
                  </span>
                  Upgrade anytime
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-6 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-300">Next step</p>
              <h3 className="mt-3 text-2xl font-bold">Pick a plan before your trial ends.</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Compare monthly, yearly, and lifetime options with seat-based totals before checkout.
              </p>
              <Link
                href="/pricing"
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-white px-5 text-sm font-bold text-slate-950 transition hover:bg-orange-100"
              >
                View Plans
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Seats" value="1" hint="Current workspace seat" />
          <StatCard label="Monthly cost" value="Free trial" hint="No charge today" />
          <StatCard label="Trial ends" value={loading ? 'Loading...' : formatDate(business?.expires_at || null)} />
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Billing history</h2>
              <p className="mt-1 text-sm text-slate-500">Invoices and payment events will appear here.</p>
            </div>
            <button
              type="button"
              disabled
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-400"
            >
              Download CSV
            </button>
          </div>

          <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8M8 11h8M8 15h5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2-2-1.35V4a1 1 0 0 1 1-1Z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-950">No billing events yet</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Once a payment, refund, or invoice is created, it will be listed here with the date, amount, and status.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
