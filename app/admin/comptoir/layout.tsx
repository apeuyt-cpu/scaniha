import { guardProduct } from '@/lib/admin/product-guard'

// Route guard for /admin/comptoir/* (counter wheel). Part of the fidelity product.
export default async function ComptoirLayout({ children }: { children: React.ReactNode }) {
  const locked = await guardProduct('fidelite')
  return locked ?? <>{children}</>
}
