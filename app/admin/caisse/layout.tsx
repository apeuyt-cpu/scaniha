import { guardProduct } from '@/lib/admin/product-guard'

// Route guard for /admin/caisse/* (loyalty counter: credit/redeem, codes).
// Part of the fidelity product.
export default async function CaisseLayout({ children }: { children: React.ReactNode }) {
  const locked = await guardProduct('fidelite')
  return locked ?? <>{children}</>
}
