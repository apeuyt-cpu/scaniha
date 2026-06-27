import { guardProduct } from '@/lib/admin/product-guard'

// Route guard for /admin/menu/* — locks a fidelity-only café out of the menu editor.
export default async function MenuLayout({ children }: { children: React.ReactNode }) {
  const locked = await guardProduct('menu')
  return locked ?? <>{children}</>
}
