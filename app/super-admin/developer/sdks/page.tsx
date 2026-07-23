/**
 * Developer Platform — SDK Manager Page
 * /super-admin/developer/sdks
 */

import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getLanguageLogo } from '@/components/super-admin/developer/LanguageLogos'

export const dynamic = 'force-dynamic'

const SDK_LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', pkg: 'npm' },
  { id: 'typescript', label: 'TypeScript', pkg: 'npm' },
  { id: 'python',     label: 'Python',     pkg: 'pip' },
  { id: 'php',        label: 'PHP',        pkg: 'composer' },
  { id: 'ruby',       label: 'Ruby',       pkg: 'gem' },
  { id: 'go',         label: 'Go',         pkg: 'go get' },
  { id: 'java',       label: 'Java',       pkg: 'maven' },
  { id: 'csharp',     label: 'C#',         pkg: 'nuget' },
  { id: 'flutter',    label: 'Flutter',    pkg: 'pub' },
  { id: 'react',      label: 'React',      pkg: 'npm' },
  { id: 'nextjs',     label: 'Next.js',    pkg: 'npm' },
  { id: 'laravel',    label: 'Laravel',    pkg: 'composer' },
]

const STATUS_COLORS: Record<string, string> = {
  stable:     'bg-green-50 text-green-700 border-green-200',
  beta:       'bg-blue-50 text-blue-700 border-blue-200',
  deprecated: 'bg-amber-50 text-amber-700 border-amber-200',
  yanked:     'bg-red-50 text-red-700 border-red-200',
}

async function getSdkVersions() {
  const admin = await createServiceRoleClient()
  const { data } = await (admin.from('dev_sdk_versions') as any)
    .select('*')
    .order('published_at', { ascending: false })
  return data ?? []
}

export default async function SdkManagerPage() {
  await requireSuperAdmin()
  const versions = await getSdkVersions().catch(() => [])

  const defaultReleases: Record<string, any> = {
    javascript: {
      version: '1.0.0',
      status: 'stable',
      npm_package: '@scaniha/sdk',
      changelog: 'Official JavaScript client for Browser, Node.js & React Native',
      download_url: '/sdks/scaniha-sdk.js',
      docs_url: '/super-admin/developer/docs',
    },
    typescript: {
      version: '1.0.0',
      status: 'stable',
      npm_package: '@scaniha/sdk-ts',
      changelog: 'Strongly typed TypeScript client with full API interfaces',
      download_url: '/sdks/scaniha-sdk.ts',
      docs_url: '/super-admin/developer/docs',
    },
    react: {
      version: '1.0.0',
      status: 'beta',
      npm_package: '@scaniha/react',
      changelog: 'React hooks & components for Scaniha API',
      download_url: '/sdks/scaniha-sdk.js',
      docs_url: '/super-admin/developer/docs',
    },
    nextjs: {
      version: '1.0.0',
      status: 'beta',
      npm_package: '@scaniha/next',
      changelog: 'Next.js App Router server & client components integration',
      download_url: '/sdks/scaniha-sdk.js',
      docs_url: '/super-admin/developer/docs',
    },
  }

  const byLanguage: Record<string, any[]> = {}
  for (const v of versions) {
    if (!byLanguage[v.language]) byLanguage[v.language] = []
    byLanguage[v.language].push(v)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight">SDK Manager</h1>
        <p className="mt-0.5 text-sm text-[var(--muted)]">Versioned SDK releases for all languages and frameworks</p>
      </div>

      {/* Language grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SDK_LANGUAGES.map((lang) => {
          const langVersions = byLanguage[lang.id] ?? []
          const latest = langVersions[0] ?? defaultReleases[lang.id]

          return (
            <div key={lang.id} className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-soft hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-50 border border-zinc-100 p-2 shadow-xs">
                    {getLanguageLogo(lang.id, 28)}
                  </div>
                  <div>
                    <p className="font-bold text-[var(--ink)] text-sm">{lang.label}</p>
                    <p className="text-[11px] font-mono text-zinc-400">{lang.pkg}</p>
                  </div>
                </div>
                {latest ? (
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${STATUS_COLORS[latest.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                    v{latest.version}
                  </span>
                ) : (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-400">
                    No releases
                  </span>
                )}
              </div>

              {latest ? (
                <div className="space-y-2.5">
                  {latest.npm_package && (
                    <code className="block overflow-x-auto rounded-xl bg-zinc-900 px-3 py-2 font-mono text-xs text-green-400">
                      {lang.pkg} install {latest.npm_package}
                    </code>
                  )}
                  {latest.changelog && (
                    <p className="text-xs text-[var(--muted)] line-clamp-2">{latest.changelog}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    {latest.docs_url && (
                      <a href={latest.docs_url}
                        className="flex-1 rounded-xl border border-[var(--line)] py-2 text-center text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition">
                        Docs
                      </a>
                    )}
                    {latest.download_url && (
                      <a href={latest.download_url} download
                        className="flex-1 rounded-xl bg-[var(--brand)] py-2 text-center text-xs font-semibold text-white shadow-xs hover:bg-[var(--brand-600)] transition">
                        Download
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-200 py-6 text-center">
                  <p className="text-xs text-zinc-400 font-medium">SDK coming soon</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
