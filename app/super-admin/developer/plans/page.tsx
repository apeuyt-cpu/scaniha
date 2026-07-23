/**
 * Developer Platform — API Plans Page
 * /super-admin/developer/plans
 */

import { requireSuperAdmin } from '@/lib/auth'
import { listApiPlans } from '@/lib/developer-platform/api-plans'
import Link from 'next/link'
import type { ApiPlan } from '@/lib/developer-platform/types'
import { IconBox } from '@/components/super-admin/shell/icons'

export const dynamic = 'force-dynamic'

export default async function PlansPage() {
  await requireSuperAdmin()
  const plans = await listApiPlans(true).catch(() => [] as ApiPlan[])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight">API Plans</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">Configure pricing tiers, limits, and feature access</p>
        </div>
        <Link href="/super-admin/developer/plans/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-600)] transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          New Plan
        </Link>
      </div>

      {/* Plans grid */}
      {plans.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-zinc-200 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 border border-zinc-200">
            <IconBox className="w-8 h-8" />
          </div>
          <div>
            <p className="font-semibold text-[var(--ink)]">No plans yet</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Create your first API pricing plan</p>
          </div>
          <Link href="/super-admin/developer/plans/new"
            className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-600)] transition">
            Create Plan
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  )
}

function PlanCard({ plan }: { plan: ApiPlan }) {
  const typeColors: Record<string, string> = {
    free:     'bg-zinc-100 text-zinc-600',
    trial:    'bg-blue-50 text-blue-700',
    paid:     'bg-green-50 text-green-700',
    custom:   'bg-violet-50 text-violet-700',
    lifetime: 'bg-amber-50 text-amber-700',
  }

  const price = plan.price_monthly
    ? `$${plan.price_monthly}/mo`
    : plan.price_lifetime
    ? `$${plan.price_lifetime} lifetime`
    : 'Custom'

  const limits = [
    { label: 'Businesses',  value: fmtLimit(plan.max_businesses) },
    { label: 'Req/min',     value: fmtLimit(plan.rate_limit_per_minute) },
    { label: 'Req/day',     value: fmtLimit(plan.rate_limit_per_day) },
    { label: 'Req/month',   value: fmtLimit(plan.rate_limit_per_month) },
    { label: 'Webhooks',    value: fmtLimit(plan.webhook_limit) },
    { label: 'Storage',     value: plan.storage_limit_mb === -1 ? 'Unlimited' : `${plan.storage_limit_mb} MB` },
  ]

  const features = [
    plan.custom_branding  && 'Custom Branding',
    plan.white_label      && 'White Label',
    plan.priority_support && 'Priority Support',
    plan.access_ai_features && 'AI Features',
    plan.access_beta_features && 'Beta Access',
  ].filter(Boolean) as string[]

  return (
    <div className="relative flex flex-col rounded-2xl border border-[var(--line)] bg-white shadow-soft overflow-hidden">
      {/* Badge */}
      {plan.badge && (
        <div className="absolute top-4 right-4">
          <span className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
            style={{ background: plan.badge_color ?? '#6366f1' }}>
            {plan.badge}
          </span>
        </div>
      )}

      <div className="p-5 flex-1">
        {/* Plan header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-sm font-bold">
            {plan.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-[var(--ink)]">{plan.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${typeColors[plan.plan_type]}`}>
                {plan.plan_type}
              </span>
              {!plan.is_public && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500">
                  Hidden
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="mb-4">
          <span className="text-2xl font-bold text-[var(--ink)]">{price}</span>
          {plan.price_yearly && (
            <span className="ml-2 text-xs text-green-600 font-medium">or ${plan.price_yearly}/yr</span>
          )}
        </div>

        {/* Description */}
        {plan.description && (
          <p className="text-xs text-[var(--muted)] mb-4">{plan.description}</p>
        )}

        {/* Limits */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {limits.map((l) => (
            <div key={l.label} className="rounded-lg bg-zinc-50 px-2 py-1.5 text-center">
              <p className="text-[10px] text-zinc-400 font-medium">{l.label}</p>
              <p className="text-xs font-bold text-[var(--ink)] mt-0.5">{l.value}</p>
            </div>
          ))}
        </div>

        {/* Feature flags */}
        {features.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {features.map((f) => (
              <span key={f} className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                ✓ {f}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-2 border-t border-[var(--line)] p-3">
        <Link href={`/super-admin/developer/plans/${plan.id}`}
          className="flex-1 rounded-lg bg-[var(--brand)] py-2 text-center text-sm font-semibold text-white hover:bg-[var(--brand-600)] transition">
          Edit Plan
        </Link>
        <Link href={`/super-admin/developer/plans/${plan.id}?tab=features`}
          className="flex-1 rounded-lg border border-[var(--line)] py-2 text-center text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition">
          Features
        </Link>
      </div>
    </div>
  )
}

function fmtLimit(n: number): string {
  if (n === -1) return '∞'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}
