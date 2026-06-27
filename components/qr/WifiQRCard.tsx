'use client'

import { useState } from 'react'
import QRCode from 'qrcode'

/** Escape special characters per the WIFI: QR payload spec. */
function esc(v: string): string {
  return v.replace(/([\\;,:"'])/g, '\\$1')
}

export default function WifiQRCard() {
  const [ssid, setSsid] = useState('')
  const [password, setPassword] = useState('')
  const [security, setSecurity] = useState<'WPA' | 'WEP' | 'nopass'>('WPA')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    if (!ssid.trim()) {
      setError('Entrez le nom de votre réseau Wi-Fi.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const payload =
        security === 'nopass'
          ? `WIFI:T:nopass;S:${esc(ssid.trim())};;`
          : `WIFI:T:${security};S:${esc(ssid.trim())};P:${esc(password)};;`
      const dataUrl = await QRCode.toDataURL(payload, {
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      })
      setQrDataUrl(dataUrl)
    } catch {
      setError('Génération impossible. Vérifiez les caractères saisis.')
    } finally {
      setBusy(false)
    }
  }

  function download() {
    if (!qrDataUrl) return
    const link = document.createElement('a')
    link.download = `wifi-${ssid.trim().toLowerCase().replace(/\s+/g, '-') || 'qr'}.png`
    link.href = qrDataUrl
    link.click()
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-[#FEFEFE] shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900">📶 Code QR Wi-Fi</h3>
        <p className="mt-1 text-sm text-gray-500">
          Vos clients scannent et se connectent — sans demander le mot de passe. Imprimez-le à côté du QR menu sur
          votre support de table.
        </p>
      </div>
      <div className="grid gap-6 p-4 sm:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nom du réseau (SSID)</label>
            <input
              value={ssid}
              onChange={(e) => setSsid(e.target.value)}
              placeholder="MonCafe_WiFi"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Sécurité</label>
            <div className="flex gap-2">
              {([
                { id: 'WPA', label: 'WPA / WPA2' },
                { id: 'WEP', label: 'WEP' },
                { id: 'nopass', label: 'Ouvert' },
              ] as const).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSecurity(s.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    security === s.id
                      ? 'border-orange-400 bg-orange-50 text-orange-700'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {security !== 'nopass' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Mot de passe</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="mt-1 text-xs text-gray-400">Le mot de passe reste sur votre appareil — rien n’est enregistré.</p>
            </div>
          )}
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="w-full rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
          >
            {busy ? 'Génération…' : 'Générer le QR Wi-Fi'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl bg-gray-50 p-4">
          {qrDataUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Code QR Wi-Fi" className="h-40 w-40 rounded-lg border-2 border-gray-100 bg-white" />
              <button
                type="button"
                onClick={download}
                className="mt-3 w-full rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-200"
              >
                Télécharger
              </button>
            </>
          ) : (
            <div className="text-center text-sm text-gray-400">
              <div className="mx-auto mb-2 flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-3xl">
                📶
              </div>
              L’aperçu apparaîtra ici
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
