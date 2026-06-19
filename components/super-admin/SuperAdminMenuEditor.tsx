'use client'

import { ToastProvider } from '@/components/admin/ui/Toast'
import ModernMenuBuilder from '@/components/menu/ModernMenuBuilder'

/**
 * Super-admin menu management for ANY business — reuses the OWNER editor
 * (ModernMenuBuilder) verbatim, so it has full parity (categories, items,
 * images, reorder, import) and the same sharp image optimization via
 * /api/upload. Wrapped in the admin ToastProvider (the editor uses it); Locale +
 * Currency come from the root AppProvider. Writes work because of the additive
 * super_admin RLS policy (supabase/superadmin_menu_rls.sql).
 */
export default function SuperAdminMenuEditor({
  businessId,
  businessName,
  slug,
  initialCategories,
}: {
  businessId: string
  businessName: string
  slug: string
  initialCategories: any[]
}) {
  return (
    <ToastProvider>
      <div className="mb-5" dir="ltr">
        <a href="/super-admin/businesses" className="text-sm font-semibold text-orange-600 hover:text-orange-700">← Établissements</a>
        <h1 className="mt-2 text-xl font-bold text-zinc-900">Menu — {businessName}</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Gestion complète : catégories, plats, photos. Lien public :{' '}
          <a href={`/${slug}`} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline" dir="ltr">/{slug}</a>
        </p>
      </div>
      <ModernMenuBuilder businessId={businessId} initialCategories={initialCategories} />
    </ToastProvider>
  )
}
