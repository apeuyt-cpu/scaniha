import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Renamed to /admin/statistiques in the v2 remake. Shim keeps old links working.
export default function AnalyticsRedirect() {
  redirect('/admin/statistiques')
}
