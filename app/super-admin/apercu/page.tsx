import Link from 'next/link'
import { requireSuperAdmin } from '@/lib/auth'
import { getAllBusinesses } from '@/lib/db/business'
import { createServiceRoleClient } from '@/lib/supabase/server'
import SectionHeader from '@/components/admin/ui/SectionHeader'
import StatTile from '@/components/super-admin/StatTile'
import PaymentReview from '@/components/super-admin/PaymentReview'

export const dynamic = 'force-dynamic'

export default async function SuperAdminApercu() {
  await requireSuperAdmin()

  let businesses: any[] = []
  try {
    businesses = await getAllBusinesses()
  } catch (e) {
    console.error('Error loading businesses:', e)
  }

  let pending: any[] = []
  try {
    const admin = await createServiceRoleClient()
    const { data } = await (admin.from('payment_requests') as any)
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    pending = (data || []).map((r: any) => ({
      ...r,
      businessName: businesses.find((b) => b.id === r.business_id)?.name || r.business_id,
    }))
  } catch {
    pending = []
  }

  const now = Date.now()
  const WEEK = 7 * 24 * 60 * 60 * 1000

  const total = businesses.length
  const enPause = businesses.filter((b) => b.status === 'paused').length
  const actifs = businesses.filter(
    (b) => b.status === 'active' && (!b.expires_at || new Date(b.expires_at).getTime() > now)
  ).length
  const expirentBientot = businesses.filter((b) => {
    if (b.status !== 'active' || !b.expires_at) return false
    const t = new Date(b.expires_at).getTime()
    return t > now && t - now <= WEEK
  }).length
  const expires = businesses.filter(
    (b) => b.expires_at && new Date(b.expires_at).getTime() <= now
  ).length

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Aperçu</h1>
          <p className="mt-1 text-sm text-zinc-500">Vue d&apos;ensemble de la plateforme.</p>
        </div>
        <Link
          href="/super-admin/businesses"
          className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Gérer les comptes →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Comptes" value={total} />
        <StatTile label="Actifs" value={actifs} tone="green" />
        <StatTile label="Expire ≤7 j" value={expirentBientot} tone="amber" />
        <StatTile label="Expirés" value={expires} tone="red" />
        <StatTile label="En pause" value={enPause} tone="zinc" />
        <StatTile label="Paiements" value={pending.length} tone={pending.length > 0 ? 'orange' : 'zinc'} />
      </div>

      <div>
        <SectionHeader title="Paiements en attente" hint="Vérifiez le reçu puis approuvez — l'abonnement s'active automatiquement." />
        <PaymentReview requests={pending} />
      </div>
    </div>
  )
}
