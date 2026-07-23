/**
 * Developer Platform — Billing / Invoices Page
 * /super-admin/developer/billing
 */

import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { IconCard, IconFile, IconChart, IconBilling } from '@/components/super-admin/shell/icons'

export const dynamic = 'force-dynamic'

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  draft:         { label: 'Draft',         cls: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
  open:          { label: 'Open',          cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  paid:          { label: 'Paid',          cls: 'bg-green-50 text-green-700 border-green-200' },
  void:          { label: 'Void',          cls: 'bg-zinc-100 text-zinc-400 border-zinc-200' },
  uncollectible: { label: 'Uncollectible', cls: 'bg-red-50 text-red-700 border-red-200' },
}

async function getBillingData() {
  const admin = await createServiceRoleClient()

  const [invoicesRes, subscriptionsRes] = await Promise.all([
    (admin.from('dev_invoices') as any)
      .select('*, dev_clients(company_name, email)')
      .order('created_at', { ascending: false })
      .limit(30),
    (admin.from('dev_client_subscriptions') as any)
      .select('*, dev_clients(company_name), dev_api_plans(name, price_monthly)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return {
    invoices:      invoicesRes.data ?? [],
    subscriptions: subscriptionsRes.data ?? [],
  }
}

export default async function BillingPage() {
  await requireSuperAdmin()
  const { invoices, subscriptions } = await getBillingData().catch(() => ({ invoices: [], subscriptions: [] }))

  const totalRevenue = invoices
    .filter((i: any) => i.status === 'paid')
    .reduce((s: number, i: any) => s + (i.total ?? 0), 0)

  const openAmount = invoices
    .filter((i: any) => i.status === 'open')
    .reduce((s: number, i: any) => s + (i.total ?? 0), 0)

  const mrr = subscriptions
    .reduce((s: number, sub: any) => s + (sub.dev_api_plans?.price_monthly ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight">Billing & Revenue</h1>
        <p className="mt-0.5 text-sm text-[var(--muted)]">Invoices and subscription management</p>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Revenue',      value: `$${totalRevenue.toFixed(2)}`, Icon: IconCard, color: 'text-green-600' },
          { label: 'Open Invoices',      value: `$${openAmount.toFixed(2)}`,   Icon: IconFile, color: 'text-blue-600' },
          { label: 'MRR',                value: `$${mrr.toFixed(2)}`,          Icon: IconChart, color: 'text-violet-600' },
          { label: 'Active Subscriptions', value: subscriptions.length,         Icon: IconBilling, color: 'text-indigo-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2 mb-2 text-zinc-500">
              <s.Icon className="w-4 h-4" />
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">{s.label}</p>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Invoices */}
        <div className="rounded-2xl border border-[var(--line)] bg-white shadow-soft overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="font-bold text-[var(--ink)]">Recent Invoices</h2>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {invoices.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 border border-zinc-200">
                  <IconFile className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-[var(--ink)]">No invoices generated yet</p>
              </div>
            ) : invoices.map((inv: any) => {
              const s = STATUS_MAP[inv.status] ?? STATUS_MAP.draft
              return (
                <div key={inv.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--ink)]">{inv.invoice_number}</p>
                    <p className="text-xs text-[var(--muted)]">{inv.dev_clients?.company_name ?? '—'}</p>
                    <p className="text-[11px] text-zinc-400">
                      {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-[var(--ink)]">${inv.total?.toFixed(2) ?? '0.00'}</p>
                    <span className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${s.cls}`}>
                      {s.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="rounded-2xl border border-[var(--line)] bg-white shadow-soft overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="font-bold text-[var(--ink)]">Active Subscriptions</h2>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {subscriptions.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 border border-zinc-200">
                  <IconBilling className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-[var(--ink)]">No active paid subscriptions</p>
              </div>
            ) : subscriptions.map((sub: any) => (
              <div key={sub.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">{sub.dev_clients?.company_name ?? 'Client'}</p>
                  <span className="inline-block rounded bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 mt-0.5">
                    {sub.dev_api_plans?.name ?? 'Plan'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[var(--ink)]">${sub.dev_api_plans?.price_monthly ?? 0}/mo</p>
                  <p className="text-[11px] text-zinc-400 capitalize">{sub.billing_cycle ?? 'monthly'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
