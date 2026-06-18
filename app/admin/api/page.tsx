import PageShell from '@/components/admin/ui/PageShell'
import ApiKeyManager from '@/components/admin/api/ApiKeyManager'

export const dynamic = 'force-dynamic'

export default function ApiKeysPage() {
  return (
    <PageShell
      title="API & Développeurs"
      subtitle="Générez des clés API pour connecter votre caisse ou un outil tiers à votre programme de fidélité. Consultez la documentation pour les détails techniques."
    >
      <ApiKeyManager />
    </PageShell>
  )
}
