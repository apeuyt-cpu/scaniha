'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import PageShell from '@/components/admin/ui/PageShell'
import Card from '@/components/admin/ui/Card'
import { resolveMode, type ProductMode } from '@/lib/design-settings'

type QrKind = 'menu' | 'fidelity'

export default function SharePage() {
  const [slug, setSlug] = useState<string | null>(null)
  const [qrKey, setQrKey] = useState<string>('') // play key embedded in the QR when the gate is on
  const [gated, setGated] = useState(false)
  const [mode, setMode] = useState<ProductMode>('menu')
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    try { setOrigin(window.location.origin) } catch {}
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/admin/game')
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const j = await res.json()
          setSlug(j.slug)
          const g = j.config?.qrGate
          if (g && typeof g === 'object' && g.enabled && typeof g.qrKey === 'string' && g.qrKey) {
            setGated(true)
            setQrKey(g.qrKey)
          }
        } else if (res.status === 401 || res.status === 403) {
          window.location.href = '/login'
        }
        // Product mode → which QR codes to show (menu vs fidelity vs both).
        const bizRes = await fetch('/api/admin/business')
        if (bizRes.ok && bizRes.headers.get('content-type')?.includes('application/json')) {
          setMode(resolveMode(await bizRes.json()))
        }
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])

  // The menu and the loyalty program are two separate products → two separate QR
  // codes. A café that runs both gets one of each; menu-only / fidelity-only get
  // just the relevant one.
  const showMenu = mode === 'menu' || mode === 'both'
  const showFidelity = mode === 'fidelity' || mode === 'both'

  return (
    <PageShell title="Partage">
      <div className="space-y-4">
        {mode === 'both' && (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
            Deux codes séparés : un pour le <span className="font-semibold text-zinc-800">menu</span>, un pour la{' '}
            <span className="font-semibold text-zinc-800">fidélité</span>. Imprimez celui qui correspond à chaque emplacement.
          </p>
        )}
        {showMenu && <QrCard kind="menu" slug={slug} origin={origin} gated={gated} qrKey={qrKey} />}
        {showFidelity && <QrCard kind="fidelity" slug={slug} origin={origin} gated={gated} qrKey={qrKey} />}
      </div>
    </PageShell>
  )
}

/** One downloadable QR card for a single product (menu or fidelity). */
function QrCard({ kind, slug, origin, gated, qrKey }: { kind: QrKind; slug: string | null; origin: string; gated: boolean; qrKey: string }) {
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const path = kind === 'menu' ? `/${slug}` : `/${slug}/fidelite`
  const plainUrl = slug && origin ? `${origin}${path}` : ''
  // The printed QR carries the play key (when the gate is on) so scanning mints a
  // play session; the copy-link below stays plain — sharing it must NOT grant play.
  const qrTarget = plainUrl ? `${plainUrl}${gated && qrKey ? `?s=${qrKey}` : ''}` : ''

  useEffect(() => {
    if (!qrTarget) { setQr(null); return }
    let alive = true
    QRCode.toDataURL(qrTarget, { width: 600, margin: 1, color: { dark: '#18181b', light: '#FFFFFF' } })
      .then((d) => { if (alive) setQr(d) })
      .catch((e) => console.error(e))
    return () => { alive = false }
  }, [qrTarget])

  const copy = () => {
    if (!plainUrl) return
    navigator.clipboard.writeText(plainUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const download = () => {
    if (!qr || !slug) return
    const a = document.createElement('a')
    a.download = `${slug}-${kind}-qr.png`
    a.href = qr
    a.click()
  }

  const title = kind === 'menu' ? 'Code QR du menu' : 'Code QR de la fidélité'
  const subtitle = kind === 'menu'
    ? 'Imprimez-le pour vos tables — vos clients scannent pour voir le menu.'
    : 'Imprimez-le pour le comptoir — vos clients scannent pour ouvrir leur carte de fidélité et jouer à la roue.'
  const linkLabel = kind === 'menu' ? 'Lien du menu' : 'Lien de la fidélité'
  const viewLabel = kind === 'menu' ? 'Voir le menu ↗' : 'Voir la fidélité ↗'
  const linkPath = kind === 'menu' ? `/${slug ?? '…'}` : `/${slug ?? '…'}/fidelite`

  return (
    <Card>
      <h2 className="font-bold text-zinc-900">{title}</h2>
      <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>
      {gated && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          🔒 Le scan du QR est requis pour jouer. Ce code contient la clé de jeu — <span className="font-semibold">re-téléchargez-le et ré-imprimez-le</span> après chaque régénération de la clé.
        </p>
      )}
      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="flex h-48 w-48 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={title} className="h-44 w-44" />
          ) : (
            <div className="h-44 w-44 animate-pulse rounded-xl bg-zinc-100" />
          )}
        </div>
        <div className="w-full min-w-0 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">{linkLabel}</label>
            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <code className="min-w-0 flex-1 truncate text-sm text-zinc-600" dir="ltr">{linkPath}</code>
              <button onClick={copy} disabled={!slug} className={`shrink-0 text-sm font-semibold disabled:opacity-50 ${copied ? 'text-green-600' : 'text-orange-600 hover:text-orange-700'}`}>
                {copied ? 'Copié ✓' : 'Copier'}
              </button>
            </div>
            {gated && <p className="mt-1 text-[11px] text-zinc-400">Le lien copié ne contient pas la clé de jeu — seul le QR imprimé débloque la roue.</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={download} disabled={!qr} className="rounded-xl bg-zinc-100 px-3 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200 disabled:opacity-50">
              Télécharger
            </button>
            <a href={plainUrl || '#'} target="_blank" rel="noopener noreferrer" className={`rounded-xl px-3 py-2.5 text-center text-sm font-semibold text-white transition ${plainUrl ? 'bg-orange-500 hover:bg-orange-600' : 'pointer-events-none bg-zinc-300'}`}>
              {viewLabel}
            </a>
          </div>
        </div>
      </div>
    </Card>
  )
}
