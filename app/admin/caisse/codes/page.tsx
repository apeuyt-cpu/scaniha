import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Staff & PIN management is now the unified Personnel page.
export default function CodesRedirect() {
  redirect('/admin/personnel')
}
