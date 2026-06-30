import { requireSuperAdmin } from '@/lib/auth'
import { getAllBusinesses } from '@/lib/db/business'
import DevisGenerator from '@/components/super-admin/DevisGenerator'

export const dynamic = 'force-dynamic'

export default async function DevisPage() {
  await requireSuperAdmin()

  let businesses: { id: string; name: string }[] = []
  try {
    const all = await getAllBusinesses()
    businesses = (all || [])
      .map((b: any) => ({ id: b.id, name: b.name || 'Sans nom' }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  } catch (e) {
    console.error('devis: load businesses:', e)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Devis</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Générez un devis professionnel (forfait + supports QR) à envoyer au client, puis téléchargez-le en PDF.
        </p>
      </div>
      <DevisGenerator businesses={businesses} />
    </div>
  )
}
