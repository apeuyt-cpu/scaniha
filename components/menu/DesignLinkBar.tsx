'use client'

import { useEffect, useState } from 'react'

type Item = { n: string; label: string }

/**
 * Copy bar for the /menu gallery — gives the owner the 4 full, send-ready URLs
 * (built from the live origin) plus a one-tap "copy all four".
 */
export default function DesignLinkBar({ items }: { items: Item[] }) {
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { setOrigin(window.location.origin) }, [])

  const urlFor = (n: string) => `${origin}/menu/${n}`

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600)
    } catch {}
  }

  const allText = items.map((d) => `${d.label} : ${urlFor(d.n)}`).join('\n')

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-zinc-900">Les 4 liens à envoyer</p>
          <p className="text-xs text-zinc-500">Un lien par design — copiez-les tous d’un coup.</p>
        </div>
        <button
          onClick={() => copy(allText, 'all')}
          className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
        >
          {copied === 'all' ? '✓ Copié' : 'Copier les 4 liens'}
        </button>
      </div>

      <ul className="mt-4 divide-y divide-zinc-100">
        {items.map((d) => (
          <li key={d.n} className="flex items-center gap-3 py-2.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-zinc-900 text-xs font-bold text-white">{d.n}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-800">{d.label}</p>
              <p className="truncate text-xs text-zinc-400" dir="ltr">{origin ? urlFor(d.n) : `/menu/${d.n}`}</p>
            </div>
            <button
              onClick={() => copy(urlFor(d.n), d.n)}
              className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              {copied === d.n ? '✓' : 'Copier'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
