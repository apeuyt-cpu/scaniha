'use client'

import { useEffect, useState } from 'react'

/**
 * LOCAL-ONLY internal product catalog, rendered inside the landing page.
 *
 * This component holds NO product data — it just renders whatever lives in the
 * gitignored public/_local-products.json. That file is never committed or
 * deployed, so:
 *   • In production (and for anyone who clones the repo) this renders NOTHING
 *     — the NODE_ENV gate short-circuits it AND the JSON isn't there to fetch.
 *   • Only on a dev machine that has the JSON does the section appear.
 * No build/runtime risk: it's a plain fetch (no static import of a maybe-missing
 * module), so a missing file just yields an empty section.
 */

type Kind = 'glow' | 'paper' | 'premium'
type Product = {
  name: string
  tagline: string
  description: string
  kind: Kind
  value?: string
  board?: { heading: string; items: { name: string; price: string }[] }[]
  prices: { size: string; price: string }[]
}

const TBD = 'À définir'

const THEMES: Record<Kind, { wrap: string; glowText?: string; heading: string; item: string; price: string; dotted: string; qrBg: string }> = {
  glow: { wrap: 'bg-gradient-to-b from-zinc-900 to-black', glowText: '0 0 12px rgba(245,184,46,0.6)', heading: 'text-amber-300', item: 'text-zinc-300', price: 'text-zinc-200', dotted: 'border-zinc-700', qrBg: 'bg-white' },
  paper: { wrap: 'bg-[#FBF7F0]', heading: 'text-zinc-800', item: 'text-zinc-700', price: 'text-zinc-900', dotted: 'border-zinc-300', qrBg: 'bg-white ring-1 ring-zinc-300' },
  premium: { wrap: 'bg-gradient-to-b from-white to-amber-50', heading: 'text-amber-700', item: 'text-zinc-700', price: 'text-amber-800', dotted: 'border-amber-200', qrBg: 'bg-white ring-1 ring-amber-200' },
}

function BoardPreview({ product }: { product: Product }) {
  const t = THEMES[product.kind] ?? THEMES.glow
  if (!product.board) return null
  return (
    <div className={`relative p-6 ${t.wrap}`}>
      {product.kind === 'glow' && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(244,123,32,0.25), transparent 60%)' }} />
      )}
      <div className="relative space-y-4 font-mono text-sm">
        {product.board.map((sec) => (
          <div key={sec.heading}>
            <p className={`font-bold tracking-[0.3em] ${t.heading}`} style={t.glowText ? { textShadow: t.glowText } : undefined}>{sec.heading}</p>
            <ul className={`mt-1 space-y-0.5 ${t.item}`}>
              {sec.items.map((it) => (
                <li key={it.name} className="flex items-baseline justify-between gap-2">
                  <span>{it.name}</span>
                  <span className={`flex-1 border-b border-dotted ${t.dotted}`} />
                  <span className={`tabular-nums ${t.price}`}>{it.price}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="pt-2 text-center">
          <p className={`text-xs font-bold tracking-[0.25em] ${t.heading}`} style={t.glowText ? { textShadow: t.glowText } : undefined}>SCAN TO ORDER</p>
          <div className={`mx-auto mt-2 grid h-16 w-16 grid-cols-4 grid-rows-4 gap-0.5 rounded p-1.5 ${t.qrBg}`}>
            {Array.from({ length: 16 }).map((_, k) => (
              <span key={k} className={(k * 7 + 3) % 3 === 0 ? 'bg-black' : 'bg-transparent'} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LocalProductsSection() {
  const [products, setProducts] = useState<Product[] | null>(null)
  useEffect(() => {
    // Dev machine only — never even attempts the fetch in production.
    if (process.env.NODE_ENV !== 'development') return
    let cancelled = false
    fetch('/_local-products.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j && Array.isArray(j.products)) setProducts(j.products) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Renders nothing in production, or anywhere the local JSON is absent.
  if (process.env.NODE_ENV !== 'development') return null
  if (!products || products.length === 0) return null

  return (
    <section className="bg-zinc-950 px-4 py-16 text-zinc-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center gap-3">
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-400">Local uniquement</span>
          <h2 className="text-2xl font-extrabold tracking-tight">Catalogue interne — produits physiques</h2>
        </div>
        <p className="mb-10 text-sm text-zinc-400">Visible uniquement sur ta machine (serveur de dev). Ni dans le dépôt, ni en ligne.</p>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => (
            <article key={p.name} className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-xl">
              <BoardPreview product={p} />
              <div className="p-6">
                <span className="text-xs font-bold text-amber-500">Produit {i + 1}</span>
                <h3 className="mt-1 text-xl font-extrabold">{p.name}</h3>
                <p className="text-sm italic text-zinc-400">{p.tagline}</p>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">{p.description}</p>
                {p.value && (
                  <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
                    <p className="text-sm font-semibold leading-relaxed text-amber-300">{p.value}</p>
                  </div>
                )}
                <div className="mt-5 space-y-2">
                  {p.prices.map((pr) => (
                    <div key={pr.size} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5">
                      <span className="text-sm text-zinc-400">{pr.size}</span>
                      <span className={`text-base font-bold ${pr.price === TBD ? 'text-zinc-500 italic' : 'text-amber-400'}`}>{pr.price}</span>
                    </div>
                  ))}
                  <p className="pt-1 text-xs text-zinc-500">Prix selon la taille / le format.</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
