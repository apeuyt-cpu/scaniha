import Link from 'next/link'
import { requireSuperAdmin } from '@/lib/auth'
import { getAllBusinesses } from '@/lib/db/business'
import { createServiceRoleClient } from '@/lib/supabase/server'
import StatCard from '@/components/admin/ui/StatCard'
import SectionHeader from '@/components/admin/ui/SectionHeader'
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
  // Active = active status AND not expired (or no expiry).
  const actifs = businesses.filter(
    (b) => b.status === 'active' && (!b.expires_at || new Date(b.expires_at).getTime() > now)
  ).length
  // Expiring soon = active, has an expiry within the next 7 days (and not already past).
  const expirentBientot = businesses.filter((b) => {
    if (b.status !== 'active' || !b.expires_at) return false
    const t = new Date(b.expires_at).getTime()
    return t > now && t - now <= WEEK
  }).length
  // Expired = has a past expiry (regardless of stored status — the read path no longer auto-pauses).
  const expires = businesses.filter(
    (b) => b.expires_at && new Date(b.expires_at).getTime() <= now
  ).length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Aperçu</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Vue d&apos;ensemble de la plateforme.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Comptes" value={total} />
        <StatCard label="Actifs" value={actifs} />
        <StatCard label="Expire ≤7 j" value={expirentBientot} />
        <StatCard label="Expirés" value={expires} />
        <StatCard label="En pause" value={enPause} />
        <StatCard label="Paiements en attente" value={pending.length} />
      </div>

      <div>
        <SectionHeader title="Paiements en attente" hint="Vérifiez le reçu puis approuvez — l'abonnement s'active automatiquement." />
        <PaymentReview requests={pending} />
      </div>

      <Link href="/super-admin/businesses" className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700">
        Gérer les comptes →
      </Link>
    </div>
  )
}
