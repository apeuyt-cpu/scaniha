import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Renamed to /admin/partage in the v2 remake. Shim keeps old links working.
export default function ShareRedirect() {
  redirect('/admin/partage')
}
