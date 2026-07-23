/**
 * Developer Platform — API Products Page
 * /super-admin/developer/products
 */

import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { ApiProduct } from '@/lib/developer-platform/types'
import ProductsManager from './ProductsManager'

export const dynamic = 'force-dynamic'

async function getProducts(): Promise<ApiProduct[]> {
  const admin = await createServiceRoleClient()
  const { data } = await (admin.from('dev_api_products') as any)
    .select('*, dev_product_endpoints(*)')
    .order('created_at', { ascending: true })
  return (data ?? []).map((p: any) => ({
    ...p, endpoints: p.dev_product_endpoints ?? [],
  })) as ApiProduct[]
}

export default async function ApiProductsPage() {
  await requireSuperAdmin()
  const products = await getProducts().catch(() => [] as ApiProduct[])
  return <ProductsManager initialProducts={products} />
}
