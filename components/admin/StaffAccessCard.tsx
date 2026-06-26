'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import Card from '@/components/admin/kit/Card'

/**
 * Internal "staff access" QR + printable sticker.
 *
 * The QR encodes the chosen admin destination directly (e.g. /admin/caisse). A
 * staff member scanning it lands on that page — the middleware sends them through
 * /login?next=… first when they aren't signed in, then bounces them straight to
 * the destination. The owner picks where it leads (persisted to design_settings).
 */

const DESTS: { target: string; label: string; hint: string }[] = [
  { target: '/admin/caisse', label: 'Caisse', hint: 'Valider un code, créditer des points, rechercher un client.' },
  { target: '/admin/caisse?tab=pin', label: 'Codes PIN', hint: 'Les codes PIN du personnel.' },
  { target: '/admin/comptoir', label: 'Roue (comptoir)', hint: 'La roue opérée par le personnel.' },
  { target: '/admin', label: 'Tableau de bord', hint: "L'accueil admin complet." },
]

// Admin routes were renamed in the v2 remake. Map any value an owner saved
// before the swap to its new home so the picker still highlights the right
// option (printed QRs already resolve via the redirect shims on the old paths).
const LEGACY_TARGET: Record<string, string> = {
  '/admin/caisse/codes': '/admin/caisse?tab=pin',
  '/admin/roulette': '/admin/comptoir',
}

export default function StaffAccessCard({ origin, target, onChange, disabled }:
  { origin: string; target: string; onChange: (t: string) => void; disabled?: boolean }) {
  const normalized = LEGACY_TARGET[target] ?? target
  const dest = DESTS.find((d) => d.target === normalized) ?? DESTS[0]
  const url = origin ? `${origin}${dest.target}` : ''
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!url) { setQr(null); return }
    let alive = true
    QRCode.toDataURL(url, { width: 600, margin: 1, color: { dark: '#18181b', light: '#FFFFFF' } })
      .then((d) => { if (alive) setQr(d) })
      .catch((e) => console.error(e))
    return () => { alive = false }
  }, [url])

  const copy = () => {
    if (!url) return
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const downloadQr = () => {
    if (!qr) return
    const a = document.createElement('a')
    a.download = 'acces-staff-qr.png'
    a.href = qr
    a.click()
  }

  // Compose a ready-to-print sticker (QR + labels) on a canvas → PNG.
  async function downloadSticker() {
    if (!qr) return
    const c = document.createElement('canvas')
    c.width = 720; c.height = 960
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#FFF7EC'; ctx.fillRect(0, 0, 720, 960)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#F47B20'; ctx.font = '800 64px Arial, sans-serif'; ctx.fillText('ACCÈS STAFF', 360, 132)
    ctx.fillStyle = '#1C1917'; ctx.font = '700 42px Arial, sans-serif'; ctx.fillText(dest.label, 360, 196)
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    if ((ctx as unknown as { roundRect?: unknown }).roundRect) (ctx as unknown as { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(150, 250, 420, 420, 30)
    else ctx.rect(150, 250, 420, 420)
    ctx.fill()
    const img = new Image()
    img.src = qr
    try { await img.decode() } catch { /* draw whatever decoded */ }
    ctx.drawImage(img, 180, 280, 360, 360)
    ctx.fillStyle = '#4A433D'; ctx.font = '600 34px Arial, sans-serif'; ctx.fillText('Scannez puis connectez-vous', 360, 742)
    ctx.fillStyle = '#8A8178'; ctx.font = '500 28px Arial, sans-serif'; ctx.fillText('Réservé au personnel', 360, 788)
    ctx.fillStyle = '#F47B20'; ctx.font = '800 36px Arial, sans-serif'; ctx.fillText('Scaniha', 360, 902)
    const a = document.createElement('a')
    a.download = 'sticker-acces-staff.png'
    a.href = c.toDataURL('image/png')
    a.click()
  }

  return (
    <Card>
      <h2 className="font-bold text-zinc-900">Accès staff (interne)</h2>
      <p className="mt-0.5 text-sm text-zinc-500">
        Un QR pour votre personnel : il scanne, se connecte, et arrive directement sur la page choisie. À coller derrière le comptoir — pas pour les clients.
      </p>
      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="flex h-48 w-48 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR accès staff" className="h-44 w-44" />
          ) : (
            <div className="h-44 w-44 animate-pulse rounded-xl bg-zinc-100" />
          )}
        </div>
        <div className="w-full min-w-0 space-y-3">
          <div>
            <p className="mb-1.5 text-sm font-medium text-zinc-700">Ce QR ouvre sur</p>
            <div className="flex flex-wrap gap-2">
              {DESTS.map((d) => (
                <button
                  key={d.target}
                  type="button"
                  onClick={() => onChange(d.target)}
                  disabled={disabled}
                  className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50 ${normalized === d.target ? 'bg-orange-500 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-zinc-400">{dest.hint} Connexion requise — le personnel utilise vos identifiants.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <code className="min-w-0 flex-1 truncate text-sm text-zinc-600" dir="ltr">{dest.target}</code>
            <button onClick={copy} className={`shrink-0 text-sm font-semibold ${copied ? 'text-green-600' : 'text-orange-600 hover:text-orange-700'}`}>
              {copied ? 'Copié ✓' : 'Copier'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={downloadQr} disabled={!qr} className="rounded-xl bg-zinc-100 px-3 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200 disabled:opacity-50">
              Télécharger le QR
            </button>
            <button onClick={downloadSticker} disabled={!qr} className="rounded-xl bg-orange-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50">
              Télécharger le sticker
            </button>
          </div>
        </div>
      </div>
    </Card>
  )
}
