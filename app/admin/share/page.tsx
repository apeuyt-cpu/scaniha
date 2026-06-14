'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import PageShell from '@/components/admin/ui/PageShell'
import Card from '@/components/admin/ui/Card'

export default function SharePage() {
  const [slug, setSlug] = useState<string | null>(null)
  const [qrKey, setQrKey] = useState<string>('') // play key embedded in the QR when the gate is on
  const [gated, setGated] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])

  // The QR encodes the keyed URL when the play-gate is on, so scanning mints a
  // play session. The copy-link below stays plain — sharing it must NOT grant play.
  const qrTarget = slug ? `${window.location.origin}/${slug}${gated && qrKey ? `?s=${qrKey}` : ''}` : ''

  useEffect(() => {
    if (!qrTarget) return
    ;(async () => {
      try {
        setQr(await QRCode.toDataURL(qrTarget, { width: 600, margin: 1, color: { dark: '#18181b', light: '#FFFFFF' } }))
      } catch (e) {
        console.error(e)
      }
    })()
  }, [qrTarget])

  const menuUrl = slug ? `${window.location.origin}/${slug}` : ''
  const copy = () => {
    if (!menuUrl) return
    navigator.clipboard.writeText(menuUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const download = () => {
    if (!qr || !slug) return
    const a = document.createElement('a')
    a.download = `${slug}-qr.png`
    a.href = qr
    a.click()
  }

  return (
    <PageShell title="Partage">
      <div className="space-y-4">
        <Card>
          <h2 className="font-bold text-zinc-900">Code QR du menu</h2>
          <p className="mt-0.5 text-sm text-zinc-500">Imprimez-le pour vos tables — vos clients scannent pour voir le menu.</p>
          {gated && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
              🔒 Le scan du QR est requis pour jouer. Ce code contient la clé de jeu — <span className="font-semibold">re-téléchargez-le et ré-imprimez-le</span> après chaque régénération de la clé.
            </p>
          )}
          <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div className="flex h-48 w-48 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="Code QR du menu" className="h-44 w-44" />
              ) : (
                <div className="h-44 w-44 animate-pulse rounded-xl bg-zinc-100" />
              )}
            </div>
            <div className="w-full min-w-0 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Lien du menu</label>
                <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <code className="min-w-0 flex-1 truncate text-sm text-zinc-600" dir="ltr">/{slug ?? '…'}</code>
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
                <a href={menuUrl || '#'} target="_blank" rel="noopener noreferrer" className={`rounded-xl px-3 py-2.5 text-center text-sm font-semibold text-white transition ${slug ? 'bg-orange-500 hover:bg-orange-600' : 'pointer-events-none bg-zinc-300'}`}>
                  Voir le menu ↗
                </a>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  )
}
