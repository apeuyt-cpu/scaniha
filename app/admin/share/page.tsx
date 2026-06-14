'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import PageShell from '@/components/admin/ui/PageShell'
import Card from '@/components/admin/ui/Card'

export default function SharePage() {
  const [slug, setSlug] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/admin/business')
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          setSlug((await res.json()).slug)
        } else if (res.status === 401 || res.status === 403) {
          window.location.href = '/login'
        }
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])

  useEffect(() => {
    if (!slug) return
    ;(async () => {
      try {
        const url = `${window.location.origin}/${slug}`
        setQr(await QRCode.toDataURL(url, { width: 600, margin: 1, color: { dark: '#18181b', light: '#FFFFFF' } }))
      } catch (e) {
        console.error(e)
      }
    })()
  }, [slug])

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
