import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Renamed to /admin/comptoir in the v2 remake. Shim keeps old links (and
// printed staff QRs pointing at /admin/roulette) working.
export default function RouletteRedirect() {
  redirect('/admin/comptoir')
}
