import {
  IconDashboard, IconStore, IconInbox, IconCard, IconFile, IconActivity, IconEye, IconChart,
  // Developer Platform icons
  IconCode, IconKey, IconWebhook, IconLayers, IconTerminal, IconShield, IconUsers, IconBook,
  IconZap, IconGlobe, IconBilling, IconPlugin,
} from './icons'

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
  apercu:    { href: '/super-admin/apercu',      label: "Vue d'ensemble",  icon: IconDashboard },
  comptes:   { href: '/super-admin/businesses',  label: 'Comptes',         icon: IconStore },
  demandes:  { href: '/super-admin/demandes',    label: 'Demandes',        icon: IconInbox, badge: 'requests' },
  paiements: { href: '/super-admin/payments',    label: 'Paiements',       icon: IconCard,  badge: 'payments' },
  devis:     { href: '/super-admin/devis',       label: 'Devis',           icon: IconFile },
  activite:  { href: '/super-admin/activity',    label: 'Activité',        icon: IconActivity },
  superEyes: { href: '/super-admin/super-eyes',  label: 'Super Eyes',      icon: IconEye },
  stats:     { href: '/super-admin/analytics',   label: 'Statistiques',    icon: IconChart },
  // ── Developer Platform ──────────────────────────────────────────────────
  devOverview:  { href: '/super-admin/developer',           label: 'Overview',         icon: IconCode },
  devClients:   { href: '/super-admin/developer/clients',   label: 'API Clients',      icon: IconUsers },
  devKeys:      { href: '/super-admin/developer/keys',      label: 'API Keys',         icon: IconKey },
  devPlans:     { href: '/super-admin/developer/plans',     label: 'API Plans',        icon: IconLayers },
  devProducts:  { href: '/super-admin/developer/products',  label: 'API Products',     icon: IconPlugin },
  devUsage:     { href: '/super-admin/developer/usage',     label: 'Usage Monitor',    icon: IconZap },
  devWebhooks:  { href: '/super-admin/developer/webhooks',  label: 'Webhooks',         icon: IconWebhook },
  devOAuth:     { href: '/super-admin/developer/oauth',     label: 'OAuth 2.0',        icon: IconShield },
  devAudit:     { href: '/super-admin/developer/audit',     label: 'Audit Logs',       icon: IconActivity },
  devDocs:      { href: '/super-admin/developer/docs',      label: 'Documentation',    icon: IconBook },
  devSdks:      { href: '/super-admin/developer/sdks',      label: 'SDK Manager',      icon: IconTerminal },
  devVersions:  { href: '/super-admin/developer/versions',  label: 'API Versions',     icon: IconGlobe },
  devBilling:   { href: '/super-admin/developer/billing',   label: 'Billing',          icon: IconBilling },
} satisfies Record<string, SuperNavItem>

/** Single nav model for the super-admin sidebar + mobile bottom-nav. */
export function useSuperNav(): { groups: SuperNavGroup[]; primaries: SuperNavItem[] } {
  const groups: SuperNavGroup[] = [
    { title: null,          items: [ITEMS.apercu] },
    { title: 'Comptes',     items: [ITEMS.comptes, ITEMS.demandes] },
    { title: 'Finance',     items: [ITEMS.paiements, ITEMS.devis] },
    { title: 'Surveillance', items: [ITEMS.activite, ITEMS.superEyes] },
    { title: 'Compte',      items: [ITEMS.stats] },
    // Developer Platform section
    { title: '⚡ Developer Platform', items: [ITEMS.devOverview] },
    { title: 'Clients & Keys',  items: [ITEMS.devClients, ITEMS.devKeys, ITEMS.devPlans, ITEMS.devProducts] },
    { title: 'Monitoring',      items: [ITEMS.devUsage, ITEMS.devWebhooks, ITEMS.devAudit] },
    { title: 'Configuration',   items: [ITEMS.devOAuth, ITEMS.devSdks, ITEMS.devVersions, ITEMS.devDocs, ITEMS.devBilling] },
  ]
  // Mobile: 4 primaries + Plus
  const primaries = [ITEMS.apercu, ITEMS.comptes, ITEMS.devOverview, ITEMS.devClients]
  return { groups, primaries }
}
