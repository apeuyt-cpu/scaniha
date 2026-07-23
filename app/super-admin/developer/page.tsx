/**
 * Developer Platform — Super Admin Overview Dashboard
 * /super-admin/developer
 */

import { requireSuperAdmin } from '@/lib/auth'
import { getPlatformStats, listApiClients } from '@/lib/developer-platform/api-clients'
import Link from 'next/link'
import {
  IconUsers, IconKey, IconZap, IconRocket, IconBilling, IconCard,
  IconBox, IconPlugin, IconChart, IconWebhook, IconShield, IconFile,
  IconTerminal, IconBook, IconStore, IconPlus
} from '@/components/super-admin/shell/icons'

export const dynamic = 'force-dynamic'

export default async function DeveloperPlatformPage() {
  await requireSuperAdmin()

  let stats = {
    total_clients: 0, active_clients: 0, total_api_keys: 0, active_api_keys: 0,
    total_requests_today: 0, total_requests_month: 0, avg_response_ms: 0,
    error_rate_percent: 0, revenue_month: 0, active_subscriptions: 0,
    webhooks_total: 0, rate_limit_hits_today: 0,
  }
  let recentClients: any[] = []

  try {
    [stats, { clients: recentClients }] = await Promise.all([
      getPlatformStats(),
      listApiClients({ page: 1, per_page: 5, sort: 'created_at', order: 'desc' }),
    ])
  } catch {}

  const statCards = [
    { label: 'Total Clients',       value: stats.total_clients,       sub: `${stats.active_clients} active`,        color: 'blue',   Icon: IconUsers },
    { label: 'Active API Keys',     value: stats.active_api_keys,     sub: `${stats.total_api_keys} total`,         color: 'orange', Icon: IconKey },
    { label: 'Requests Today',      value: fmtNum(stats.total_requests_today), sub: `${stats.error_rate_percent}% error rate`, color: 'green', Icon: IconZap },
    { label: 'Avg Response Time',   value: `${stats.avg_response_ms}ms`,       sub: 'last 24h',                      color: 'purple', Icon: IconRocket },
    { label: 'Active Subscriptions',value: stats.active_subscriptions, sub: 'paying plans',                          color: 'emerald',Icon: IconBilling },
    { label: 'Revenue This Month',  value: `$${stats.revenue_month.toFixed(2)}`, sub: 'invoiced & paid',             color: 'amber',  Icon: IconCard },
  ]

  const QUICK_NAV = [
    { href: '/super-admin/developer/clients/new', Icon: IconUsers, label: 'New Client',    desc: 'Add API client',      bg: 'bg-blue-50 text-blue-600' },
    { href: '/super-admin/developer/plans/new',   Icon: IconBox,   label: 'New Plan',      desc: 'Create pricing plan', bg: 'bg-orange-50 text-orange-600' },
    { href: '/super-admin/developer/products',    Icon: IconPlugin,label: 'API Products',  desc: 'Manage endpoints',    bg: 'bg-green-50 text-green-600' },
    { href: '/super-admin/developer/usage',       Icon: IconChart, label: 'Usage Monitor', desc: 'Real-time metrics',   bg: 'bg-purple-50 text-purple-600' },
  ]

  const MODULES = [
    { href: '/super-admin/developer/plans',    Icon: IconBox,      label: 'API Plans',      desc: 'Configure pricing tiers and limits' },
    { href: '/super-admin/developer/keys',     Icon: IconKey,      label: 'API Keys',       desc: 'Manage all platform keys' },
    { href: '/super-admin/developer/webhooks', Icon: IconWebhook,  label: 'Webhooks',       desc: 'Webhook delivery management' },
    { href: '/super-admin/developer/oauth',    Icon: IconShield,   label: 'OAuth 2.0',      desc: 'OAuth client registrations' },
    { href: '/super-admin/developer/audit',    Icon: IconFile,     label: 'Audit Logs',     desc: 'Immutable activity trail' },
    { href: '/super-admin/developer/billing',  Icon: IconBilling,  label: 'Billing',        desc: 'Invoices & subscriptions' },
    { href: '/super-admin/developer/sdks',     Icon: IconTerminal, label: 'SDK Manager',    desc: 'Published SDK versions' },
    { href: '/super-admin/developer/docs',     Icon: IconBook,     label: 'Documentation',  desc: 'OpenAPI & Postman' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-lg shadow-lg">
              <IconZap className="w-5 h-5 text-white" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight">Developer Platform</h1>
              <p className="text-sm text-[var(--muted)]">Enterprise API Access Management</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/super-admin/developer/clients/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-600)] transition">
            <IconPlus className="w-4 h-4 text-white" />
            <span>New Client</span>
          </Link>
          <Link href="/super-admin/developer/plans/new"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-zinc-50 transition">
            <IconPlus className="w-4 h-4 text-zinc-600" />
            <span>New Plan</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {statCards.map((card) => (
          <div key={card.label}
            className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-white p-5 shadow-soft">
            <div className={`absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl
              ${card.color === 'blue'    ? 'bg-blue-50 text-blue-600'    :
                card.color === 'orange'  ? 'bg-orange-50 text-orange-600'  :
                card.color === 'green'   ? 'bg-green-50 text-green-600'   :
                card.color === 'purple'  ? 'bg-purple-50 text-purple-600'  :
                card.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <card.Icon className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-[var(--ink)] tabular-nums">{card.value}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Nav Grid */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--muted)]">Quick Access</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_NAV.map((item) => (
            <Link key={item.href} href={item.href}
              className="group flex flex-col items-center gap-2.5 rounded-2xl border border-[var(--line)] bg-white p-5 text-center shadow-soft transition hover:border-[var(--brand)] hover:shadow-soft-lg">
              <span className={`flex h-12 w-12 items-center justify-center rounded-xl transition group-hover:scale-110 ${item.bg}`}>
                <item.Icon className="w-6 h-6" />
              </span>
              <span className="text-sm font-semibold text-[var(--ink)]">{item.label}</span>
              <span className="text-[11px] text-[var(--muted)] leading-tight">{item.desc}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Two column: Recent Clients + Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Clients */}
        <div className="rounded-2xl border border-[var(--line)] bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <h2 className="text-sm font-bold text-[var(--ink)]">Recent API Clients</h2>
            <Link href="/super-admin/developer/clients" className="text-xs font-semibold text-[var(--brand)] hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {recentClients.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
                  <IconStore className="w-6 h-6" />
                </div>
                <p className="text-sm text-[var(--muted)]">No API clients registered yet</p>
                <Link href="/super-admin/developer/clients/new"
                  className="text-xs font-semibold text-[var(--brand)] hover:underline">
                  Create your first client →
                </Link>
              </div>
            ) : recentClients.map((client) => (
              <Link key={client.id} href={`/super-admin/developer/clients/${client.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50 transition">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white shadow-xs">
                  {client.company_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--ink)]">{client.company_name}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{client.email}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  client.status === 'active'    ? 'bg-green-50 text-green-700 border-green-200' :
                  client.status === 'suspended' ? 'bg-red-50 text-red-700 border-red-200'    :
                  'bg-zinc-50 text-zinc-600 border-zinc-200'
                }`}>
                  {client.status}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Platform Modules */}
        <div className="rounded-2xl border border-[var(--line)] bg-white shadow-soft">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="text-sm font-bold text-[var(--ink)]">Platform Modules</h2>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {MODULES.map((mod) => (
              <Link key={mod.href} href={mod.href}
                className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-zinc-50 transition">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 border border-zinc-200">
                  <mod.Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--ink)]">{mod.label}</p>
                  <p className="text-xs text-[var(--muted)]">{mod.desc}</p>
                </div>
                <svg className="shrink-0 text-zinc-300" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}
