// Unified access-control vocabulary: ONE flat capability list covering both
// PAGES and ACTIONS, used by the server (authorize) and the client (hide nav).
// Extends the POS-only matrix (lib/pos/permissions.ts) to the whole app.

export type StaffRole = 'cashier' | 'server' | 'manager' | 'owner'

export const PAGE_CAPS = [
  'page.dashboard', 'page.menu', 'page.promotions', 'page.fidelite', 'page.caisse',
  'page.comptoir', 'page.commandes', 'page.pos', 'page.design', 'page.partage',
  'page.stats', 'page.reglages', 'page.personnel', 'page.api',
] as const

export const ACTION_CAPS = [
  'pos.sell', 'pos.discount', 'pos.void', 'pos.refund', 'pos.open_drawer',
  'caisse.award', 'caisse.redeem', 'caisse.validate_code', 'caisse.decline',
  'comptoir.spin', 'comptoir.save_win', 'comptoir.set_win_status',
  'orders.manage', 'catalog.manage', 'promos.manage', 'loyalty.manage',
  'reports.view', 'staff.manage', 'settings.manage', 'design.manage', 'api.manage',
] as const

export type Capability = (typeof PAGE_CAPS)[number] | (typeof ACTION_CAPS)[number]

export const ALL_CAPS: Capability[] = ([] as Capability[]).concat(PAGE_CAPS as any, ACTION_CAPS as any)

/** French labels for the owner's permission editor. */
export const CAP_LABEL: Partial<Record<Capability, string>> = {
  'page.dashboard': 'Tableau de bord', 'page.menu': 'Menu', 'page.promotions': 'Promotions',
  'page.fidelite': 'Fidélité', 'page.caisse': 'Caisse', 'page.comptoir': 'Roue au comptoir',
  'page.commandes': 'Commandes', 'page.pos': 'Caisse POS', 'page.design': 'Design', 'page.partage': 'Partage',
  'page.stats': 'Statistiques', 'page.reglages': 'Réglages', 'page.personnel': 'Personnel', 'page.api': 'API',
  'pos.sell': 'Encaisser (POS)', 'pos.discount': 'Faire une remise', 'pos.void': 'Annuler une vente',
  'pos.refund': 'Rembourser', 'pos.open_drawer': 'Ouvrir le tiroir',
  'caisse.award': 'Créditer des points', 'caisse.redeem': 'Échanger une récompense',
  'caisse.validate_code': 'Valider un code', 'caisse.decline': 'Refuser',
  'comptoir.spin': 'Tourner la roue', 'comptoir.save_win': 'Enregistrer un gain', 'comptoir.set_win_status': 'Clôturer un gain',
  'orders.manage': 'Gérer les commandes', 'catalog.manage': 'Modifier le menu', 'promos.manage': 'Gérer les promotions',
  'loyalty.manage': 'Configurer la fidélité', 'reports.view': 'Voir les statistiques',
  'staff.manage': 'Gérer le personnel', 'settings.manage': 'Réglages', 'design.manage': 'Design & marque', 'api.manage': 'Clés API',
}

const STAFF_ONLY_OUT: Capability[] = ['staff.manage', 'settings.manage', 'api.manage', 'page.personnel', 'page.reglages', 'page.api']

/** Editable presets (the owner can override per staff). Owner = everything, implicit. */
export const PRESETS: Record<Exclude<StaffRole, 'owner'>, Capability[]> = {
  cashier: ['page.dashboard', 'page.caisse', 'page.pos', 'pos.sell', 'pos.open_drawer', 'caisse.award', 'caisse.validate_code'],
  server: ['page.dashboard', 'page.commandes', 'orders.manage', 'page.caisse', 'caisse.award'],
  // manager = everything except the owner-only administration caps
  manager: ALL_CAPS.filter((c) => STAFF_ONLY_OUT.indexOf(c) === -1),
}

export interface PermissionOverrides { allow?: Capability[]; deny?: Capability[] }

function uniq(a: Capability[]): Capability[] {
  const out: Capability[] = []
  for (const c of a) if (out.indexOf(c) === -1) out.push(c)
  return out
}

/**
 * Effective capabilities for a staff member: preset for the role + per-staff
 * allow − deny, optionally intersected with what the café's plan actually offers.
 * Owner always gets everything (the anti-lockout guard).
 */
export function resolveCapabilities(role: StaffRole, overrides?: PermissionOverrides, available?: Capability[]): Capability[] {
  let caps: Capability[] = role === 'owner' ? ALL_CAPS.slice() : (PRESETS[role] || []).slice()
  if (overrides?.allow?.length) caps = uniq(caps.concat(overrides.allow))
  if (overrides?.deny?.length) caps = caps.filter((c) => overrides.deny!.indexOf(c) === -1)
  if (available && available.length) caps = caps.filter((c) => available.indexOf(c) !== -1)
  return caps
}

/** Membership check. */
export function can(caps: Capability[], cap: Capability): boolean {
  return caps.indexOf(cap) !== -1
}

/** Owner opt-in: does this café require a staff PIN after login? Default OFF. */
export function isStaffPinEnabled(business: any): boolean {
  return Boolean(business?.design_settings && typeof business.design_settings === 'object' && (business.design_settings as any).staffPinEnabled)
}

/** Map an admin nav href → the page capability that gates it. */
export const PAGE_CAP_FOR_PATH: Record<string, Capability> = {
  '/admin': 'page.dashboard', '/admin/menu': 'page.menu', '/admin/promotions': 'page.promotions',
  '/admin/fidelite': 'page.fidelite', '/admin/caisse': 'page.caisse', '/admin/comptoir': 'page.comptoir',
  '/admin/commandes': 'page.commandes', '/pos': 'page.pos', '/admin/design': 'page.design',
  '/admin/partage': 'page.partage', '/admin/statistiques': 'page.stats', '/admin/reglages': 'page.reglages',
  '/admin/personnel': 'page.personnel', '/admin/api': 'page.api',
}
