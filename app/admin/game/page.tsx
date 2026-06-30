import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// The old fidelity page was replaced by the unified hub at /admin/fidelite.
// Keep the route as a redirect so old links/bookmarks still work.
export default function GamePage() {
  redirect('/admin/fidelite')
}
