import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Consolidated into the tabbed /admin/fidelite in the v2 remake.
export default function RoueRedirect() {
  redirect('/admin/fidelite?tab=roue')
}
