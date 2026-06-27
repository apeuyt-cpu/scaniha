/**
 * Wallet data layer — the multi-business loyalty portefeuille. Wraps the
 * `diner_wallet` SECURITY DEFINER RPC (supabase/wallet.sql): given a phone, it
 * returns one entry per fidelity-LIVE café where that phone has any loyalty
 * activity, each with the café's branding + its OWN per-café balance + mode.
 *
 * The caller (GET /api/wallet) MUST derive the phone from the session token, never
 * from the client — the RPC trusts whatever phone it is handed.
 */
import { createServiceRoleClient } from '@/lib/supabase/server'

export interface WalletCafe {
  slug: string
  name: string
  logo_url: string | null
  accent: string
  balance: number
  has_roulette: boolean
  has_loyalty: boolean
  active_wins: number
}

export async function loadWallet(phone: string): Promise<WalletCafe[]> {
  if (!phone) return []
  try {
    const supabase: any = await createServiceRoleClient()
    const { data, error } = await supabase.rpc('diner_wallet', { p_phone: phone })
    if (error) {
      console.error('diner_wallet rpc:', error.message)
      return []
    }
    return Array.isArray(data) ? (data as WalletCafe[]) : []
  } catch (e: any) {
    console.error('loadWallet:', e?.message)
    return []
  }
}
