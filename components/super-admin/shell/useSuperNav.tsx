import { IconDashboard, IconStore, IconInbox, IconCard, IconFile, IconActivity, IconEye, IconChart } from './icons'

export interface SuperNavItem {
  href: string
  label: string
  icon: (p: { width?: number; height?: number }) => React.ReactNode
  /** which badge count to show, if any */
  badge?: 'requests' | 'payments'
}
export interface SuperNavGroup { title: string | null; items: SuperNavItem[] }

export function navItemActive(href: string, pathname: string): boolean {
  if (href === '/super-admin') return pathname === '/super-admin'
  return pathname === href || pathname.startsWith(href + '/')
}

const ITEMS = {
  apercu: { href: '/super-admin/apercu', label: "Vue d'ensemble", icon: IconDashboard },
  comptes: { href: '/super-admin/businesses', label: 'Comptes', icon: IconStore },
  demandes: { href: '/super-admin/demandes', label: 'Demandes', icon: IconInbox, badge: 'requests' },
  paiements: { href: '/super-admin/payments', label: 'Paiements', icon: IconCard, badge: 'payments' },
  devis: { href: '/super-admin/devis', label: 'Devis', icon: IconFile },
  activite: { href: '/super-admin/activity', label: 'Activité', icon: IconActivity },
  superEyes: { href: '/super-admin/super-eyes', label: 'Super Eyes', icon: IconEye },
  stats: { href: '/super-admin/analytics', label: 'Statistiques', icon: IconChart },
} satisfies Record<string, SuperNavItem>

/** Single nav model for the super-admin sidebar + mobile bottom-nav. */
export function useSuperNav(): { groups: SuperNavGroup[]; primaries: SuperNavItem[] } {
  const groups: SuperNavGroup[] = [
    { title: null, items: [ITEMS.apercu] },
    { title: 'Comptes', items: [ITEMS.comptes, ITEMS.demandes] },
    { title: 'Finance', items: [ITEMS.paiements, ITEMS.devis] },
    { title: 'Surveillance', items: [ITEMS.activite, ITEMS.superEyes] },
    { title: 'Compte', items: [ITEMS.stats] },
  ]
  // Mobile: 4 primaries + Plus
  const primaries = [ITEMS.apercu, ITEMS.comptes, ITEMS.demandes, ITEMS.paiements]
  return { groups, primaries }
}
