import { getProductMode, isOrderingLive } from '@/lib/design-settings'
import { isPosLive } from '@/lib/pos/config'
import { PAGE_CAP_FOR_PATH } from '@/lib/access/permissions'
import {
  IconDashboard, IconMenu, IconReceipt, IconScan, IconGift,
  IconBrush, IconShare, IconChart, IconCounter, IconGear, IconUsers, IconRegister, IconMegaphone,
} from './icons'

export interface NavItemDef {
  href: string
  label: string
  /** Renders the icon at the caller's size. */
  icon: (p: { width?: number; height?: number }) => React.ReactNode
}

export interface NavGroup {
  /** null = ungrouped (the pinned dashboard). */
  title: string | null
  items: NavItemDef[]
}

export interface AdminNav {
  /** Sidebar groups, in order. */
  groups: NavGroup[]
  /** Flat list (for active-match + bottom-nav lookups). */
  all: NavItemDef[]
  /** Mobile bottom-nav: 4 plan-aware primaries (the 5th slot is always "Plus"). */
  primaries: NavItemDef[]
}

/** Is `pathname` inside `href`'s section? `/admin` matches only itself. */
export function navItemActive(href: string, pathname: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(href + '/')
}

const ITEMS = {
  dashboard: { href: '/admin', label: 'Tableau de bord', icon: IconDashboard },
  pos: { href: '/pos', label: 'Caisse POS', icon: IconRegister },
  commandes: { href: '/admin/commandes', label: 'Commandes', icon: IconReceipt },
  caisse: { href: '/admin/caisse', label: 'Caisse', icon: IconScan },
  comptoir: { href: '/admin/comptoir', label: 'Roue au comptoir', icon: IconCounter },
  menu: { href: '/admin/menu', label: 'Menu', icon: IconMenu },
  promotions: { href: '/admin/promotions', label: 'Promotions', icon: IconMegaphone },
  fidelite: { href: '/admin/fidelite', label: 'Fidélité', icon: IconGift },
  personnel: { href: '/admin/personnel', label: 'Personnel & PIN', icon: IconUsers },
  design: { href: '/admin/design', label: 'Design & marque', icon: IconBrush },
  partage: { href: '/admin/partage', label: 'Partage & QR', icon: IconShare },
  statistiques: { href: '/admin/statistiques', label: 'Statistiques', icon: IconChart },
  reglages: { href: '/admin/reglages', label: 'Réglages', icon: IconGear },
} satisfies Record<string, NavItemDef>

/**
 * The single nav model — feeds BOTH the desktop sidebar and the mobile
 * bottom-nav so they can never drift. Gates on the plan CEILING (what the café
 * can manage), exactly like the legacy hub: a legacy café (no `products` set)
 * sees both groups; only an explicit 'menu'/'fidelity' plan hides one.
 */
export function useAdminNav(business: any, caps?: string[] | null): AdminNav {
  const products = getProductMode(business)
  const hasMenu = products !== 'fidelity'
  const hasFidelity = products !== 'menu'
  const orderingLive = isOrderingLive(business)
  const posLive = isPosLive(business)

  const ops: NavItemDef[] = []
  if (posLive) ops.push(ITEMS.pos)
  if (hasMenu && orderingLive) ops.push(ITEMS.commandes)
  if (hasFidelity) ops.push(ITEMS.caisse, ITEMS.comptoir)

  const config: NavItemDef[] = []
  if (hasMenu) config.push(ITEMS.menu)
  if (hasMenu) config.push(ITEMS.promotions)
  if (hasFidelity) config.push(ITEMS.fidelite)
  // Design is menu-chrome; a fidelity-only café still tunes its brand there.
  config.push(ITEMS.design, ITEMS.partage)
  // Staff PINs + access — meaningful once a counter (fidelity caisse or POS) runs.
  if (hasFidelity || posLive) config.push(ITEMS.personnel)

  const account: NavItemDef[] = [ITEMS.statistiques, ITEMS.reglages]

  const groups: NavGroup[] = [
    { title: null, items: [ITEMS.dashboard] },
  ]
  if (ops.length) groups.push({ title: 'Opérations', items: ops })
  groups.push({ title: 'Configuration', items: config })
  groups.push({ title: 'Compte', items: account })

  // Capability filter (UX layer; real enforcement is server-side via withStaff /
  // page guards). Drop any item whose page capability the staff lacks. caps null
  // / undefined (PIN off, owner) = keep everything.
  const hasCap = (href: string) => {
    if (!caps) return true
    const cap = PAGE_CAP_FOR_PATH[href]
    return !cap || caps.indexOf(cap) !== -1
  }
  if (caps) for (const g of groups) g.items = g.items.filter((it) => hasCap(it.href))

  const all: NavItemDef[] = []
  for (const g of groups) for (const it of g.items) all.push(it)

  // Mobile primaries: 4 most-used for this plan; "Plus" holds the rest.
  let primaries: NavItemDef[]
  if (!hasMenu) {
    // fidelity-only
    primaries = [ITEMS.dashboard, ITEMS.caisse, ITEMS.fidelite, ITEMS.comptoir]
  } else if (!hasFidelity) {
    // menu-only
    primaries = [ITEMS.dashboard, ITEMS.menu, orderingLive ? ITEMS.commandes : ITEMS.partage, ITEMS.statistiques]
  } else {
    // both
    primaries = [ITEMS.dashboard, orderingLive ? ITEMS.commandes : ITEMS.caisse, ITEMS.menu, ITEMS.fidelite]
  }
  if (caps) primaries = primaries.filter((it) => hasCap(it.href))

  return { groups, all, primaries }
}
