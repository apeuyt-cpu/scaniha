'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Toggle from '@/components/admin/ui/Toggle'
import { inputClass } from '@/components/admin/ui/Field'
import type { PresenceConfig, PresenceMode } from '@/lib/game'

/**
 * "Restreindre au réseau du restaurant" — lets the owner require physical
 * presence before a diner can spin: the café's public IP (a browser can't read
 * the Wi-Fi name) and/or a GPS geofence. Config lives in games.config.presence
 * (jsonb). Self-contained: writes games.config and lifts the new config up.
 */

const DEFAULT: PresenceConfig = { enabled: false, mode: 'ip', ips: [], geo: null, message: '', alsoRedeem: false }

function readPresence(config: Record<string, any>): PresenceConfig {
  const p = config?.presence
  if (!p || typeof p !== 'object') return DEFAULT
  return {
    enabled: Boolean(p.enabled),
    mode: p.mode === 'geo' || p.mode === 'both' ? p.mode : 'ip',
    ips: Array.isArray(p.ips) ? p.ips.map((x: any) => String(x)) : [],
    geo:
      p.geo && typeof p.geo === 'object' && typeof p.geo.lat === 'number' && typeof p.geo.lng === 'number'
        ? { lat: p.geo.lat, lng: p.geo.lng, radiusM: Number(p.geo.radiusM) > 0 ? Number(p.geo.radiusM) : 150 }
        : null,
    message: typeof p.message === 'string' ? p.message : '',
    alsoRedeem: Boolean(p.alsoRedeem),
  }
}

export default function PresenceLock({
  gameId,
  config,
  onConfig,
}: {
  gameId: string
  config: Record<string, any>
  onConfig: (c: Record<string, any>) => void
}) {
  const supabase = createClient()
  const presence = readPresence(config)
  const [myIp, setMyIp] = useState<string | null>(null)
  const [ipLoading, setIpLoading] = useState(true)
  const [locating, setLocating] = useState(false)
  const [manualIp, setManualIp] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/net/ip')
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setMyIp(j?.ip || null) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIpLoading(false) })
    return () => { cancelled = true }
  }, [])

  function commit(next: PresenceConfig) {
    const nextConfig = { ...(config || {}), presence: next }
    onConfig(nextConfig)
    ;(supabase.from('games') as any)
      .update({ config: nextConfig })
      .eq('id', gameId)
      .then(({ error }: any) => { if (error) console.error('presence save:', error.message) })
  }

  const setMode = (mode: PresenceMode) => commit({ ...presence, mode })
  const addIp = (ip: string) => {
    const v = ip.trim()
    if (v && !presence.ips.some((x) => x.toLowerCase() === v.toLowerCase())) commit({ ...presence, ips: [...presence.ips, v] })
  }
  const removeIp = (ip: string) => commit({ ...presence, ips: presence.ips.filter((x) => x !== ip) })

  function useMyLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        commit({
          ...presence,
          geo: { lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6), radiusM: presence.geo?.radiusM || 150 },
        })
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const showIp = presence.mode === 'ip' || presence.mode === 'both'
  const showGeo = presence.mode === 'geo' || presence.mode === 'both'
  const ipMatches = !!myIp && presence.ips.some((x) => x.toLowerCase() === myIp.toLowerCase())

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="min-w-0">
        <h4 className="font-semibold text-zinc-900">Restreindre au réseau du restaurant</h4>
        <p className="mt-0.5 text-xs text-zinc-400">
          N’autorisez la roue qu’aux clients sur place. Le navigateur ne peut pas lire le nom du Wi-Fi — on vérifie
          l’adresse IP publique de votre réseau et/ou la position GPS.
        </p>
      </div>

      <div className="mt-3">
        <Toggle
          checked={presence.enabled}
          onChange={(v) => commit({ ...presence, enabled: v })}
          label={presence.enabled ? 'Restriction activée' : 'Restriction désactivée'}
          hint={presence.enabled ? 'Seuls les clients présents peuvent jouer.' : 'Activez pour limiter le jeu aux clients présents.'}
        />
      </div>

      {presence.enabled && (
        <>
          {/* Mode */}
          <div className="mt-4 inline-flex rounded-xl border border-zinc-200 p-1">
            {(
              [
                ['ip', 'Wi-Fi'],
                ['geo', 'GPS'],
                ['both', 'Les deux'],
              ] as [PresenceMode, string][]
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${presence.mode === m ? 'bg-orange-500 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {showIp && (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-400">Votre réseau actuel</p>
                  <p className="truncate font-mono text-sm font-semibold text-zinc-900">
                    {ipLoading ? '…' : myIp || 'inconnu'}
                    {ipMatches && <span className="ml-2 font-sans text-xs font-semibold text-green-600">✓ ajouté</span>}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!myIp || ipMatches}
                  onClick={() => myIp && addIp(myIp)}
                  className="shrink-0 rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-600 disabled:opacity-40"
                >
                  Ajouter ce réseau
                </button>
              </div>

              <div className="mt-2 space-y-1.5">
                {presence.ips.map((ip) => (
                  <div key={ip} className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2">
                    <span className="truncate font-mono text-sm text-zinc-700">{ip}</span>
                    <button
                      type="button"
                      onClick={() => removeIp(ip)}
                      aria-label="Retirer ce réseau"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {presence.ips.length === 0 && (
                  <p className="py-2 text-center text-xs text-zinc-400">Aucun réseau autorisé — ajoutez celui du restaurant ci-dessus.</p>
                )}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <input
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  placeholder="Ajouter une IP manuellement"
                  inputMode="text"
                  className={`${inputClass} min-w-0 flex-1`}
                />
                <button
                  type="button"
                  onClick={() => { addIp(manualIp); setManualIp('') }}
                  disabled={!manualIp.trim()}
                  className="shrink-0 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-orange-300 hover:text-orange-600 disabled:opacity-40"
                >
                  Ajouter
                </button>
              </div>

              <p className="mt-2 text-[11px] leading-relaxed text-amber-700">
                ⚠️ L’IP de votre box peut changer (fournisseur d’accès). Si les clients ne peuvent plus jouer, revenez ici
                <span className="font-semibold"> sur le Wi-Fi du restaurant</span> et touchez « Ajouter ce réseau ».
              </p>
            </div>
          )}

          {showGeo && (
            <div className="mt-4 rounded-xl border border-zinc-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">Position du restaurant</p>
                  <p className="truncate text-xs text-zinc-400">{presence.geo ? `${presence.geo.lat}, ${presence.geo.lng}` : 'Non définie'}</p>
                </div>
                <button
                  type="button"
                  onClick={useMyLocation}
                  disabled={locating}
                  className="shrink-0 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-orange-300 hover:text-orange-600 disabled:opacity-50"
                >
                  {locating ? 'Localisation…' : '📍 Utiliser ma position'}
                </button>
              </div>
              {presence.geo && (
                <label className="mt-3 block">
                  <span className="text-xs font-medium text-zinc-600">Rayon autorisé : {presence.geo.radiusM} m</span>
                  <input
                    type="range"
                    min={50}
                    max={500}
                    step={10}
                    value={presence.geo.radiusM}
                    onChange={(e) => commit({ ...presence, geo: { ...presence.geo!, radiusM: Number(e.target.value) } })}
                    className="mt-1 w-full accent-orange-500"
                  />
                </label>
              )}
              <p className="mt-2 text-[11px] text-zinc-400">À configurer une fois, depuis le restaurant. Le client devra autoriser la localisation pour jouer.</p>
            </div>
          )}

          {/* Custom blocked message */}
          <label className="mt-4 block">
            <span className="text-xs font-medium text-zinc-600">Message si bloqué (optionnel)</span>
            <input
              value={presence.message}
              onChange={(e) => commit({ ...presence, message: e.target.value })}
              placeholder="Connectez-vous au Wi-Fi du restaurant pour jouer."
              className={`${inputClass} mt-1 w-full`}
            />
          </label>

          {/* Also gate redemptions */}
          <div className="mt-4">
            <Toggle
              checked={presence.alsoRedeem}
              onChange={(v) => commit({ ...presence, alsoRedeem: v })}
              label="Appliquer aussi aux récompenses"
              hint="Exiger la présence pour échanger des points contre une récompense."
            />
          </div>
        </>
      )}
    </div>
  )
}
