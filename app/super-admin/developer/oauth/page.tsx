/**
 * Developer Platform — OAuth 2.0 Clients Page
 * /super-admin/developer/oauth
 */

import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { IconShield, IconTerminal, IconRefresh } from '@/components/super-admin/shell/icons'

export const dynamic = 'force-dynamic'

async function getOAuthClients() {
  const admin = await createServiceRoleClient()
  const { data } = await (admin.from('dev_oauth_clients') as any)
    .select('*, dev_clients(company_name)')
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function OAuthPage() {
  await requireSuperAdmin()
  const clients = await getOAuthClients().catch(() => [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight">OAuth 2.0 Applications</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{clients.length} OAuth applications registered</p>
        </div>
      </div>

      {/* OAuth Flow Reference */}
      <div className="rounded-2xl border border-[var(--line)] bg-gradient-to-br from-violet-50 to-indigo-50 p-6">
        <h2 className="font-bold text-[var(--ink)] mb-3">Supported OAuth 2.0 Flows</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { flow: 'Authorization Code + PKCE', desc: 'Recommended for all client types. Secure, supports refresh tokens.', Icon: IconShield, color: 'bg-green-100 text-green-800' },
            { flow: 'Client Credentials',        desc: 'For server-to-server M2M integrations without user context.',       Icon: IconTerminal, color: 'bg-blue-100 text-blue-800' },
            { flow: 'Refresh Token',             desc: 'Obtain new access tokens without re-authorization.',                 Icon: IconRefresh, color: 'bg-violet-100 text-violet-800' },
          ].map((f) => (
            <div key={f.flow} className="rounded-xl bg-white p-4 border border-white shadow-soft">
              <div className="flex items-center gap-2 mb-2">
                <f.Icon className="w-4 h-4 text-zinc-600" />
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${f.color}`}>{f.flow}</span>
              </div>
              <p className="text-xs text-[var(--muted)]">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* OAuth Clients table */}
      <div className="rounded-2xl border border-[var(--line)] bg-white shadow-soft overflow-hidden">
        {clients.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 border border-zinc-200">
              <IconShield className="w-8 h-8" />
            </div>
            <div>
              <p className="font-semibold text-[var(--ink)]">No OAuth clients registered</p>
              <p className="mt-1 text-sm text-[var(--muted)]">OAuth applications are registered per client for delegated access</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-5 py-3 bg-zinc-50">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Application Name</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Client ID</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 w-32">Company</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 w-24">Flow Type</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 w-20">Created</span>
            </div>
            {clients.map((c: any) => (
              <div key={c.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-5 py-4 hover:bg-zinc-50 transition">
                <p className="font-semibold text-sm text-[var(--ink)]">{c.name}</p>
                <code className="font-mono text-xs text-[var(--muted)] truncate">{c.client_id}</code>
                <div className="w-32">
                  <span className="text-xs text-[var(--muted)]">{c.dev_clients?.company_name ?? '—'}</span>
                </div>
                <div className="w-24">
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                    {c.client_type}
                  </span>
                </div>
                <div className="w-20">
                  <span className="text-xs text-zinc-400">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
