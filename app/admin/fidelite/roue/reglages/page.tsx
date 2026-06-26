import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Advanced wheel settings are now an accordion inside /admin/fidelite?tab=roue.
export default function RoueReglagesRedirect() {
  redirect('/admin/fidelite?tab=roue')
}
