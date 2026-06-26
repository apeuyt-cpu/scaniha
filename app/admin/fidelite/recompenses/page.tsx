import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Consolidated into /admin/fidelite?tab=programme in the v2 remake.
export default function RecompensesRedirect() {
  redirect('/admin/fidelite?tab=programme')
}
