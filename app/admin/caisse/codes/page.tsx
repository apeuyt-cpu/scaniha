import PageShell from '@/components/admin/ui/PageShell'
import StaffPinManager from '@/components/admin/caisse/StaffPinManager'

export const dynamic = 'force-dynamic'

export default function StaffPinsPage() {
  return (
    <PageShell
      title="Codes PIN du personnel"
      subtitle="Ajoutez un code PIN par membre du personnel pour sécuriser les crédits à la caisse. Sans code, la caisse fonctionne normalement."
    >
      <StaffPinManager />
    </PageShell>
  )
}
