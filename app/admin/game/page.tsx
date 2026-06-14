import Link from 'next/link'
import PageShell from '@/components/admin/ui/PageShell'
import GameTabs from '@/components/admin/game/GameTabs'

export const dynamic = 'force-dynamic'

export default function GamePage() {
  return (
    <PageShell
      title="Programme de fidélité"
      width="3xl"
      action={
        <Link
          href="/admin/caisse"
          className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200"
        >
          Caisse →
        </Link>
      }
    >
      <GameTabs />
    </PageShell>
  )
}
