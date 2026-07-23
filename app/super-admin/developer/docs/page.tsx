/**
 * Developer Platform — Documentation Hub
 * /super-admin/developer/docs
 */

import { requireSuperAdmin } from '@/lib/auth'
import Link from 'next/link'
import { getLanguageLogo } from '@/components/super-admin/developer/LanguageLogos'
import {
  IconBook, IconGlobe, IconLock, IconBox, IconZap,
  IconPlugin, IconTerminal, IconFile, IconCode
} from '@/components/super-admin/shell/icons'

export const dynamic = 'force-dynamic'

const DOCS_SECTIONS = [
  {
    title: 'Getting Started',
    Icon: IconZap,
    color: 'from-blue-500 to-indigo-600',
    items: [
      { label: 'Authentication & API Keys', desc: 'How to authenticate API requests using Bearer tokens', slug: 'authentication' },
      { label: 'Rate Limits', desc: 'Understanding request limits and backoff strategies', slug: 'rate-limits' },
      { label: 'Error Handling', desc: 'Error codes, retry logic, and idempotency', slug: 'errors' },
      { label: 'Pagination', desc: 'Cursor and offset pagination for list endpoints', slug: 'pagination' },
    ]
  },
  {
    title: 'Core APIs',
    Icon: IconPlugin,
    color: 'from-violet-500 to-purple-600',
    items: [
      { label: 'Menu API', desc: 'Manage menus, categories, and items', slug: 'menu' },
      { label: 'Orders API', desc: 'Create, read, and manage restaurant orders', slug: 'orders' },
      { label: 'Customers API', desc: 'Customer data and loyalty profiles', slug: 'customers' },
      { label: 'Loyalty API', desc: 'Points, rewards, and redemption flows', slug: 'loyalty' },
    ]
  },
  {
    title: 'Engagement APIs',
    Icon: IconZap,
    color: 'from-green-500 to-emerald-600',
    items: [
      { label: 'Coupons API', desc: 'Create and validate discount coupons', slug: 'coupons' },
      { label: 'Spin Wheel API', desc: 'Lucky wheel game mechanics', slug: 'spin-wheel' },
      { label: 'Scratch Card API', desc: 'Digital scratch card integration', slug: 'scratch-card' },
      { label: 'Campaigns API', desc: 'Marketing campaign management', slug: 'campaigns' },
    ]
  },
  {
    title: 'Infrastructure',
    Icon: IconTerminal,
    color: 'from-orange-500 to-amber-600',
    items: [
      { label: 'Webhooks', desc: 'Real-time event notifications and retry logic', slug: 'webhooks' },
      { label: 'OAuth 2.0', desc: 'Authorization flows and token management', slug: 'oauth' },
      { label: 'Notifications API', desc: 'Push, SMS, and email notification triggers', slug: 'notifications' },
      { label: 'Media API', desc: 'Image and file upload via presigned URLs', slug: 'media' },
    ]
  },
]

const CODE_EXAMPLES = [
  {
    lang: 'cURL (Terminal / Bash)',
    logo: (
      <svg className="w-5 h-5 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" x2="20" y1="19" y2="19" />
      </svg>
    ),
    code: `curl -H "Authorization: Bearer sk_live_your_key" https://scaniha.com/api/v1/menu`,
  },
  {
    lang: 'PowerShell (Windows)',
    logo: (
      <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" x2="20" y1="19" y2="19" />
      </svg>
    ),
    code: `Invoke-RestMethod -Uri "https://scaniha.com/api/v1/menu" -Headers @{ Authorization = "Bearer sk_live_your_key" }`,
  },
  {
    lang: 'JavaScript SDK',
    logo: getLanguageLogo('javascript', 20),
    code: `const { Scaniha } = require('./scaniha-sdk.js')
const scaniha = new Scaniha({ apiKey: 'sk_live_your_key' })

const menu = await scaniha.menu.list()
console.log(menu.data)`,
  },
]

export default async function DocsPage() {
  await requireSuperAdmin()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 p-8 text-white shadow-lg">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <IconBook className="w-8 h-8 text-white" />
            <h1 className="text-3xl font-bold">API Documentation Hub</h1>
          </div>
          <p className="text-violet-200">
            Everything you need to integrate with the Scaniha Developer Platform
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm backdrop-blur-sm">
              <IconGlobe className="w-4 h-4 text-white" />
              <code className="font-mono font-medium">api.scaniha.com/v1</code>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm backdrop-blur-sm">
              <IconLock className="w-4 h-4 text-white" />
              <span>Bearer Token Auth</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm backdrop-blur-sm">
              <IconBox className="w-4 h-4 text-white" />
              <span>JSON & REST</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick start code */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-soft">
        <h2 className="font-bold text-[var(--ink)] mb-4">Quick Start Examples</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {CODE_EXAMPLES.map((ex) => (
            <div key={ex.lang} className="space-y-2">
              <div className="flex items-center gap-2">
                <span>{ex.logo}</span>
                <span className="text-sm font-semibold text-[var(--ink)]">{ex.lang}</span>
              </div>
              <pre className="overflow-x-auto rounded-xl bg-zinc-900 p-4 font-mono text-xs text-green-400 leading-relaxed">
                <code>{ex.code}</code>
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* Documentation sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {DOCS_SECTIONS.map((section) => (
          <div key={section.title} className="rounded-2xl border border-[var(--line)] bg-white shadow-soft overflow-hidden">
            <div className={`flex items-center gap-3 bg-gradient-to-r ${section.color} p-4 text-white`}>
              <section.Icon className="w-5 h-5 text-white" />
              <h2 className="font-bold">{section.title}</h2>
            </div>
            <div className="divide-y divide-[var(--line)]">
              {section.items.map((item) => (
                <div key={item.slug} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-zinc-50 transition">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">{item.label}</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{item.desc}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="rounded-lg bg-zinc-50 px-2.5 py-1 font-mono text-[11px] text-zinc-500">
                      /docs/{item.slug}
                    </span>
                    <svg className="text-zinc-300" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* OpenAPI + Postman */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'OpenAPI Spec',   desc: 'Download the full OpenAPI 3.0 specification', Icon: IconFile, action: 'Download YAML', color: 'bg-blue-600' },
          { label: 'Postman Collection', desc: 'Import all endpoints into Postman', Icon: IconCode, action: 'Download JSON', color: 'bg-orange-600' },
          { label: 'Developer Portal', desc: 'Self-service portal for your API consumers', Icon: IconGlobe, action: 'Coming Soon', color: 'bg-zinc-400' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-soft text-center">
            <div className="flex justify-center mb-3 text-zinc-700">
              <item.Icon className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-[var(--ink)] text-sm">{item.label}</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">{item.desc}</p>
            <button className={`mt-4 w-full rounded-xl py-2 text-sm font-semibold text-white transition ${item.color}`}>
              {item.action}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
