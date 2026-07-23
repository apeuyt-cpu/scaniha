/**
 * Developer Platform — API Clients Directory Page
 * /super-admin/developer/clients
 */

import { requireSuperAdmin } from '@/lib/auth'
import { listApiClients } from '@/lib/developer-platform/api-clients'
import ClientsDirectoryClient from './ClientsDirectoryClient'
import type { ApiClient } from '@/lib/developer-platform/types'

export const dynamic = 'force-dynamic'

export default async function ApiClientsPage() {
  await requireSuperAdmin()
  const { clients, total } = await listApiClients({ page: 1, per_page: 50 }).catch(() => ({
    clients: [] as ApiClient[],
    total: 0,
  }))

  return (
    <ClientsDirectoryClient
      initialClients={clients as any}
      initialTotal={total}
    />
  )
}
