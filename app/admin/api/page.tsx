import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// The API / developer keys feature is still in test mode — kept out of owners'
// hands. The dashboard link is hidden and a direct URL bounces to /admin. To
// re-enable when it ships, restore the ApiKeyManager render (see git history).
export default function ApiKeysPage() {
  redirect('/admin')
}
