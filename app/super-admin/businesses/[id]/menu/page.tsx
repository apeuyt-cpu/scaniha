import { notFound } from 'next/navigation'
import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import SuperAdminMenuEditor from '@/components/super-admin/SuperAdminMenuEditor'

export const dynamic = 'force-dynamic'

/**
 * Super-admin full menu management for one business. The super-admin layout
 * already gates super_admin; we re-check (defense in depth) and load the menu
 * with the service role, then hand it to the owner editor (reused verbatim).
 */
export default async function SuperAdminBusinessMenuPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin()
  const { id } = await params

  const admin = await createServiceRoleClient()
  const { data: business } = await (admin.from('businesses') as any)
    .select('id, name, slug')
    .eq('id', id)
    .maybeSingle()
  if (!business) notFound()

  const { data: categories } = await (admin.from('categories') as any)
    .select('*, items(*)')
    .eq('business_id', id)
    .order('position', { ascending: true })

  return (
    <SuperAdminMenuEditor
      businessId={business.id}
      businessName={business.name}
      slug={business.slug}
      initialCategories={categories || []}
    />
  )
}
