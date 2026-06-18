import type { Metadata } from 'next'
import WalletHub from '@/components/wallet/WalletHub'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: 'Portefeuille fidélité | Scaniha' },
  description: 'Tous vos cafés fidélité au même endroit : un seul compte, vos points et récompenses dans chaque établissement.',
  // Personal loyalty wallet — private, never indexed.
  robots: { index: false, follow: false },
}

export default function PortefeuillePage() {
  return (
    <div className="min-h-screen bg-white">
      <WalletHub />
    </div>
  )
}
