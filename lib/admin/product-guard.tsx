import { getActiveBusiness } from '@/lib/db/business'
import { getProductMode } from '@/lib/design-settings'
import { isPosLive } from '@/lib/pos/config'
import ProductLocked, { type GuardedProduct } from '@/components/admin/ProductLocked'

// Server-side product-access guard for the owner admin. The nav (useAdminNav)
// already HIDES products a café isn't granted; this enforces it at the ROUTE
// level too, so a deep-link / bookmark to an ungranted product page shows the
// locked screen instead of the working tool. Gating mirrors useAdminNav exactly.
// getActiveBusiness is React-cached per request, so this adds no extra DB read.

export async function guardProduct(product: GuardedProduct): Promise<React.ReactElement | null> {
  const business = await getActiveBusiness()
  // No business yet → the shell renders the "create your café" form; don't lock.
  if (!business) return null

  const mode = getProductMode(business)
  const hasMenu = mode !== 'fidelity'
  const hasFidelity = mode !== 'menu'

  let allowed = true
  switch (product) {
    case 'menu':
      allowed = hasMenu
      break
    case 'fidelite':
      allowed = hasFidelity
      break
    case 'ordering':
      // Table ordering is built on the menu; a fidelity-only café can't use it.
      allowed = hasMenu
      break
    case 'pos':
      allowed = isPosLive(business)
      break
  }

  return allowed ? null : <ProductLocked product={product} />
}
