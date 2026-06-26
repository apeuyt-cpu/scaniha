import { guardProduct } from '@/lib/admin/product-guard'

// Route-level guard for the whole /admin/fidelite/* segment (program, rewards,
// roue, roue/reglages). Locks the owner out if their plan has no fidelity.
export default async function FideliteLayout({ children }: { children: React.ReactNode }) {
  const locked = await guardProduct('fidelite')
  return locked ?? <>{children}</>
}
