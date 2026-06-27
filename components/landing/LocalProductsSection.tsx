'use client'

import { useEffect, useState } from 'react'

/**
 * LOCAL-ONLY internal product catalog, rendered inside the landing page as a
 * series of full-width alternating sections (image + copy), matching the brand.
 *
 * Holds NO product data — it renders whatever lives in the gitignored
 * public/_local-products.json (images from gitignored public/_local-products/).
 * In production (and for anyone who clones the repo) it renders NOTHING: the
 * NODE_ENV gate short-circuits it AND the JSON isn't there to fetch. Plain
 * runtime fetch (no static import) → a missing file just yields nothing.
 */

type Product = {
  name: string
  tagline?: string
  description?: string
  image?: string
  value?: string
  bullets?: string[]
  prices?: { size: string; price: string }[]
}
type Catalog = { headline?: string; subheadline?: string; valueProp?: string; products: Product[] }

const TBD = 'À définir'

/** Product photo with a clean placeholder until the local image is dropped in. */
function ProductImage({ src, alt }: { src?: string; alt: string }) {
  const [errored, setErrored] = useState(false)
  if (!src || errored) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="px-4 text-center">
          <div className="text-4xl">🖼️</div>
          <p className="mt-2 text-sm font-semibold text-orange-700">Ajoutez une photo</p>
          {src && <p className="mt-1 font-mono text-[11px] text-zinc-400">{src.replace('/_local-products/', '')}</p>}
        </div>
      </div>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="aspect-[4/3] w-full object-cover" onError={() => setErrored(true)} />
}

export default function LocalProductsSection() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    let cancelled = false
    fetch('/_local-products.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j && Array.isArray(j.products)) setCatalog(j) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (process.env.NODE_ENV !== 'development') return null
  if (!catalog || !catalog.products?.length) return null

  return (
    <>
      {/* Intro */}
      <section className="bg-white pt-20 pb-10 sm:pt-24">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">
            🔒 Local uniquement · catalogue interne
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            {catalog.headline || 'Produits physiques'}
          </h2>
          {catalog.subheadline && <p className="mt-4 text-lg leading-relaxed text-zinc-600">{catalog.subheadline}</p>}
          {catalog.valueProp && (
            <p className="mt-6 inline-block rounded-2xl border-2 border-orange-300 bg-orange-50 px-5 py-3 text-base font-extrabold text-orange-900 sm:text-lg">
              💡 {catalog.valueProp}
            </p>
          )}
        </div>
      </section>

      {/* One full-width section per product — alternating side + background */}
      {catalog.products.map((p, i) => {
        const flip = i % 2 === 1
        return (
          <section key={p.name} className={`${flip ? 'bg-[#FFF9F3]' : 'bg-white'} py-14 sm:py-20`}>
            <div className="mx-auto grid max-w-[1100px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
              {/* Image */}
              <div className={flip ? 'lg:order-2' : ''}>
                <div className="overflow-hidden rounded-3xl border border-orange-100 shadow-sm">
                  <ProductImage src={p.image} alt={p.name} />
                </div>
              </div>

              {/* Copy */}
              <div>
                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-orange-600">
                  Produit {i + 1}
                </span>
                <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">{p.name}</h3>
                {p.tagline && <p className="mt-1 text-base font-semibold text-orange-600">{p.tagline}</p>}
                {p.description && <p className="mt-4 text-[15px] leading-relaxed text-zinc-600">{p.description}</p>}

                {p.value && (
                  <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3">
                    <p className="text-sm font-semibold leading-relaxed text-orange-900">{p.value}</p>
                  </div>
                )}

                {p.bullets && p.bullets.length > 0 && (
                  <ul className="mt-5 space-y-2.5">
                    {p.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-[15px] text-zinc-700">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">✓</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {p.prices && p.prices.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2.5">
                    {p.prices.map((pr) => (
                      <div key={pr.size} className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-center">
                        <div className="text-xs text-zinc-500">{pr.size}</div>
                        <div className={pr.price === TBD ? 'mt-0.5 text-sm italic text-zinc-400' : 'mt-0.5 text-lg font-extrabold text-orange-600'}>{pr.price}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )
      })}
    </>
  )
}
