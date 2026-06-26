import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Renamed to /admin/reglages in the v2 remake. Shim keeps old links working.
export default function SettingsRedirect() {
  redirect('/admin/reglages')
}
