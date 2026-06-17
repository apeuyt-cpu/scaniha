'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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
  const supabase = createClient()
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

  const load = useCallback(async () => {
    setError(null)
    const { data: g, error: gErr } = await (supabase.from('games') as any)
      .select('*')
      .eq('business_id', businessId)
      .eq('type', 'roulette')
      .maybeSingle()
    if (gErr) {
      if (gErr.code === '42P01' || gErr.message?.includes('does not exist') || gErr.message?.includes('schema cache')) {
        setSetupNeeded(true)
        setLoading(false)
        return
      }
      console.error('useRoueGame load error:', gErr)
      setError('Impossible de charger le jeu. Réessayez.')
      setLoading(false)
      return
    }
    setGame(g)
    if (g) {
      const midnight = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
      const now = new Date().toISOString()
      const [{ data: p }, plays, pending, redeemed] = await Promise.all([
        (supabase.from('prizes') as any).select('*').eq('game_id', g.id).order('position').order('created_at'),
        (supabase.from('plays') as any).select('id', { count: 'exact', head: true }).eq('game_id', g.id).gte('created_at', midnight),
        (supabase.from('wins') as any).select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('status', 'pending').gt('expires_at', now),
        (supabase.from('wins') as any).select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('status', 'redeemed').gte('redeemed_at', midnight),
      ])
      setPrizes(p || [])
      setStats({ plays: plays.count ?? 0, pending: pending.count ?? 0, redeemed: redeemed.count ?? 0 })
    }
    setLoading(false)
  }, [businessId, supabase])

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
