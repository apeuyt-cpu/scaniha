import { NextResponse } from 'next/server'
import { withStaff } from '@/lib/access/withStaff'
import { orderingConfig } from '@/lib/design-settings'
import { tableOrderQrKey } from '@/lib/qr-session'

/** Returns print-ready, per-table URLs without exposing the shared ordering key
 * in any public QR. This route is restricted to the restaurant team. */
export const GET = withStaff('page.commandes', async (request, { business }) => {
  const ordering = orderingConfig(business)
  if (!ordering.enabled || !ordering.qrKey || ordering.tables < 1) {
    return NextResponse.json({ targets: [] })
  }

  const origin = new URL(request.url).origin
  const targets: Array<{ table: number; url: string }> = []
  for (let table = 1; table <= ordering.tables; table++) {
    const key = tableOrderQrKey(ordering.qrKey, table)
    targets.push({ table, url: `${origin}/${business.slug}?s=${encodeURIComponent(key)}&t=${table}` })
  }
  return NextResponse.json({ targets })
})
