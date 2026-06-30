import { guardProduct } from '@/lib/admin/product-guard'

// The promo banner is menu chrome — a fidelity-only café has no menu to promote.
export default async function PromotionsLayout({ children }: { children: React.ReactNode }) {
  const locked = await guardProduct('menu')
  return locked ?? <>{children}</>
}
