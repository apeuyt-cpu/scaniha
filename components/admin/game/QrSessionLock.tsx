'use client'

import { useState } from 'react'
import Link from 'next/link'
import Toggle from '@/components/admin/ui/Toggle'
import { inputClass } from '@/components/admin/ui/Field'
import { DEFAULT_QR_GATE, QR_TTL_OPTIONS } from '@/lib/game'
import type { QrGateConfig } from '@/lib/game'

/**
 * "Exiger le scan du QR pour jouer" — the only play restriction (the old Wi-Fi/
 * IP + GPS lock was removed). When on, a diner must have scanned the café's QR
 * recently; the secret key is embedded in the QR and can be rotated here, which
 * instantly invalidates every active scan. Config lives in games.config.qrGate;
 * all writes go through the server route (/api/admin/game) so a stale browser
 * Supabase token can't silently block the save.
 */
function readGate(config: Record<string, any>): QrGateConfig {
  const g = config?.qrGate
  if (!g || typeof g !== 'object') return DEFAULT_QR_GATE
  const ttl = Number(g.ttlMin)
  return {
    enabled: Boolean(g.enabled),
    ttlMin: Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_QR_GATE.ttlMin,
    qrKey: typeof g.qrKey === 'string' ? g.qrKey : '',
    message: typeof g.message === 'string' ? g.message : '',
    alsoRedeem: Boolean(g.alsoRedeem),
  }
}

function ttlLabel(min: number): string {
  if (min < 60) return `${min} min`
  const h = min / 60
  return Number.isInteger(h) ? `${h} h` : `${min} min`
}

export default function QrSessionLock({
  gameId,
  config,
  onConfig,
}: {
  gameId: string
  config: Record<string, any>
  onConfig: (c: Record<string, any>) => void
}) {
  const gate = readGate(config)
  const [busyKey, setBusyKey] = useState(false)
  const [showKey, setShowKey] = useState(false)

  async function save(next: QrGateConfig) {
    const nextConfig = { ...(config || {}), qrGate: next }
    onConfig(nextConfig)
    try {
      await fetch('/api/admin/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateGame', gameId, patch: { config: nextConfig } }),
      })
    } catch (e) {
      console.error('qr-gate save:', e)
    }
  }

  /** Mint a fresh key server-side; returns the new config (with qrKey) or null. */
  async function regenKey(): Promise<Record<string, any> | null> {
    setBusyKey(true)
    try {
      const res = await fetch('/api/admin/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenQrKey', gameId }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.config) {
        onConfig(json.config)
        return json.config
      }
    } catch (e) {
      console.error('qr-gate regen:', e)
    } finally {
      setBusyKey(false)
    }
    return null
  }

  async function toggleEnabled(v: boolean) {
    if (v && !gate.qrKey) {
      // First activation → mint a key so the QR can carry it, then flip on.
      const fresh = await regenKey()
      const key = fresh?.qrGate?.qrKey || ''
      await save({ ...gate, qrKey: key, enabled: Boolean(key) })
      return
    }
    await save({ ...gate, enabled: v })
  }

  async function regenerate() {
    const fresh = await regenKey()
    if (fresh) await save({ ...gate, qrKey: fresh?.qrGate?.qrKey || gate.qrKey, enabled: gate.enabled })
    setShowKey(true)
  }

  const maskedKey = gate.qrKey ? (showKey ? gate.qrKey : '•'.repeat(Math.min(gate.qrKey.length, 20))) : '—'

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="min-w-0">
        <h4 className="font-semibold text-zinc-900">Exiger le scan du QR pour jouer</h4>
        <p className="mt-0.5 text-xs text-zinc-400">
          Seuls les clients ayant scanné le QR du restaurant récemment peuvent tourner la roue. Le scan reste valable un
          temps limité — ensuite ils rescannent. La connexion au compte reste inchangée.
        </p>
      </div>

      <div className="mt-3">
        <Toggle
          checked={gate.enabled}
          onChange={toggleEnabled}
          label={gate.enabled ? 'Scan requis' : 'Scan non requis'}
          hint={gate.enabled ? 'Un scan récent du QR est nécessaire pour jouer.' : 'Activez pour limiter le jeu aux clients sur place.'}
        />
      </div>

      {gate.enabled && (
        <>
          {/* Validity window */}
          <div className="mt-4">
            <p className="text-xs font-medium text-zinc-600">Validité d’un scan</p>
            <div className="mt-1.5 inline-flex flex-wrap gap-1 rounded-xl border border-zinc-200 p-1">
              {QR_TTL_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => save({ ...gate, ttlMin: m })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${gate.ttlMin === m ? 'bg-orange-500 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
                >
                  {ttlLabel(m)}
                </button>
              ))}
            </div>
          </div>

          {/* Secret key + rotation */}
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-wide text-zinc-400">Clé du QR</p>
              {gate.qrKey && (
                <button type="button" onClick={() => setShowKey((s) => !s)} className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-700">
                  {showKey ? 'Masquer' : 'Afficher'}
                </button>
              )}
            </div>
            <p className="mt-1 truncate font-mono text-sm font-semibold text-zinc-900">{maskedKey}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={regenerate}
                disabled={busyKey}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-orange-300 hover:text-orange-600 disabled:opacity-50"
              >
                {busyKey ? 'Génération…' : '↻ Régénérer la clé'}
              </button>
              <Link href="/admin/share" className="text-xs font-semibold text-orange-600 hover:text-orange-700">
                Re-télécharger le QR →
              </Link>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-amber-700">
              ⚠️ Après régénération, l’ancien QR ne donne plus accès au jeu. Ré-imprimez le nouveau QR depuis <span className="font-semibold">Partage</span>.
            </p>
          </div>

          {/* Custom blocked message */}
          <label className="mt-4 block">
            <span className="text-xs font-medium text-zinc-600">Message si bloqué (optionnel)</span>
            <input
              value={gate.message}
              onChange={(e) => save({ ...gate, message: e.target.value })}
              placeholder="Scannez le QR du restaurant pour jouer."
              className={`${inputClass} mt-1 w-full`}
            />
          </label>

          {/* Also gate redemptions */}
          <div className="mt-4">
            <Toggle
              checked={gate.alsoRedeem}
              onChange={(v) => save({ ...gate, alsoRedeem: v })}
              label="Appliquer aussi aux récompenses"
              hint="Exiger un scan récent pour échanger des points contre une récompense."
            />
          </div>
        </>
      )}
    </div>
  )
}
