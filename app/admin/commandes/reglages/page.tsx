import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Consolidated into /admin/commandes?tab=reglages in the v2 remake.
export default function CommandesReglagesRedirect() {
  redirect('/admin/commandes?tab=reglages')
}
