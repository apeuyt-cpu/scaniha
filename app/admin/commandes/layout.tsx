import { guardProduct } from '@/lib/admin/product-guard'

// Route guard for /admin/commandes/* (table ordering). Requires the menu product.
export default async function CommandesLayout({ children }: { children: React.ReactNode }) {
  const locked = await guardProduct('ordering')
  return locked ?? <>{children}</>
}
