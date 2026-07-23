/**
 * Developer Platform — Client Detail Page
 * /super-admin/developer/clients/[id]
 */

import { requireSuperAdmin } from '@/lib/auth'
import { getApiClient } from '@/lib/developer-platform/api-clients'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ClientDetailHeader from './ClientDetailHeader'
import ClientDetailTabs from './ClientDetailTabs'
import { IconKey, IconWebhook, IconBox, IconCalendar } from '@/components/super-admin/shell/icons'

export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin()
  const { id } = await params
  const client = await getApiClient(id).catch(() => null)
  if (!client) notFound()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/super-admin/developer" className="hover:text-[var(--ink)] transition">Developer Platform</Link>
        <span>/</span>
        <Link href="/super-admin/developer/clients" className="hover:text-[var(--ink)] transition">Clients</Link>
        <span>/</span>
        <span className="font-semibold text-[var(--ink)]">{client.company_name}</span>
      </nav>

      {/* Client Header */}
      <ClientDetailHeader client={client as any} />

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'API Keys',     value: (client.api_keys ?? []).length, Icon: IconKey },
          { label: 'Webhooks',     value: 0, Icon: IconWebhook },
          { label: 'Plan',         value: client.subscription?.plan?.name ?? 'Default', Icon: IconBox },
          { label: 'Member Since', value: new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), Icon: IconCalendar },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-soft">
            <div className="flex items-center gap-2 text-[var(--muted)] mb-1">
              <s.Icon className="w-4 h-4 text-zinc-500" />
              <p className="text-[11px] font-bold uppercase tracking-wider">{s.label}</p>
            </div>
            <p className="mt-1 text-xl font-bold text-[var(--ink)]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <ClientDetailTabs client={client as any} />
    </div>
  )
}
