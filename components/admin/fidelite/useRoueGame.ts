'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameRow, PrizeRow } from '@/lib/game'

export interface RoueStats {
  plays: number
  pending: number
  redeemed: number
}

/**
 * Shared data layer for the roulette config, used by BOTH the clean main screen
 * (GameManager) and the "Réglages avancés" page. It loads the game + prizes +
 * today's stats and exposes the basic mutators that go through the server
 * (/api/admin/game → requireOwner + service role). Odds-specific helpers
 * (slider %, renormalisation) stay in GameManager since only that screen needs them.
 */
export function useRoueGame(businessId: string) {
  const [game, setGame] = useState<GameRow | null>(null)
  const [prizes, setPrizes] = useState<PrizeRow[]>([])
  const [stats, setStats] = useState<RoueStats>({ plays: 0, pending: 0, redeemed: 0 })
  const [loading, setLoading] = useState(true)
  const [setupNeeded, setSetupNeeded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Stable handle on the current game id so updateGame stays referentially stable
  // (no need to re-create the callback every time the game row changes).
  const gameRef = useRef<GameRow | null>(null)
  useEffect(() => { gameRef.current = game }, [game])

  const SAVE_MSG = 'Impossible d\'enregistrer. Réessayez.'

  // Read through the server (requireOwner + service role) — NOT the browser
  // Supabase client. The game tables are RLS-gated, so a super-admin impersonating
  // an owner (or staff) couldn't see the owner's game/prizes/stats client-side,
  // which made the UI think no game existed and then fail trying to re-create it.
  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/admin/game', { cache: 'no-store' })
      if (!res.ok) {
        console.error('useRoueGame load error:', res.status)
        setError('Impossible de charger le jeu. Réessayez.')
        return
      }
      const json = await res.json().catch(() => ({}))
      setGame(json.game ?? null)
      setPrizes(json.prizes ?? [])
      setStats(json.stats ?? { plays: 0, pending: 0, redeemed: 0 })
    } catch (e) {
      console.error('useRoueGame load error:', e)
      setError('Impossible de charger le jeu. Réessayez.')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => { load() }, [load])

  // Writes go through the server (requireOwner + service role) so a stale browser
  // token can never silently block them.
  const gameApi = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    const res = await fetch('/api/admin/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    })
    const json = await res.json().catch(() => ({}))
    return { ok: res.ok, json }
  }, [])

  const createGame = useCallback(async () => {
    setError(null)
    const { ok, json } = await gameApi('createGame')
    if (!ok) { console.error('useRoueGame createGame error:', json.error); setError(json.error || SAVE_MSG); return false }
    setSetupNeeded(false)
    await load()
    return true
  }, [gameApi, load])

  const updateGame = useCallback(async (patch: Partial<GameRow>) => {
    const id = gameRef.current?.id
    if (!id) return
    setGame((cur) => (cur ? { ...cur, ...patch } : cur))
    const { ok, json } = await gameApi('updateGame', { gameId: id, patch })
    if (!ok) { console.error('useRoueGame updateGame error:', json.error); setError(json.error || SAVE_MSG) }
  }, [gameApi])

  // Optimistic local update + persist (state already set by caller for slider drags).
  const persistPrize = useCallback(async (id: string, patch: Partial<PrizeRow>) => {
    const { ok, json } = await gameApi('updatePrize', { prizeId: id, patch })
    if (!ok) { console.error('useRoueGame persistPrize error:', json.error); setError(json.error || SAVE_MSG) }
  }, [gameApi])

  const updatePrize = useCallback(async (id: string, patch: Partial<PrizeRow>) => {
    setPrizes((cur) => cur.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    await persistPrize(id, patch)
  }, [persistPrize])

  return {
    game, setGame, prizes, setPrizes, stats, loading, setupNeeded, error, setError,
    reload: load, gameApi, createGame, updateGame, updatePrize, persistPrize,
  }
}
