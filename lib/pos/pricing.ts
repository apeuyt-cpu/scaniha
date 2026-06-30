// Scaniha POS — pricing & packaging (separate product, TND). Edit prices here;
// same shape as lib/payment-config.ts PAYMENT_PLANS/ADDONS so the billing flow
// (payment_requests + super-admin approval) can be forked with minimal change.

export interface PosPlan {
  id: string
  label: string
  price: number          // TND
  grantsDays: number
  cycle: 'month' | 'year'
  includedTerminals: number
  includedBranches: number
  highlight?: boolean
}

export const POS_PLANS: Record<string, PosPlan> = {
  pos_solo_month: { id: 'pos_solo_month', label: 'POS Solo — 1 mois', price: 39, grantsDays: 31, cycle: 'month', includedTerminals: 1, includedBranches: 1 },
  pos_solo_year: { id: 'pos_solo_year', label: 'POS Solo — 1 an', price: 390, grantsDays: 365, cycle: 'year', includedTerminals: 1, includedBranches: 1 },
  pos_pro_month: { id: 'pos_pro_month', label: 'POS Pro — 1 mois', price: 69, grantsDays: 31, cycle: 'month', includedTerminals: 2, includedBranches: 1, highlight: true },
  pos_pro_year: { id: 'pos_pro_year', label: 'POS Pro — 1 an', price: 690, grantsDays: 365, cycle: 'year', includedTerminals: 2, includedBranches: 1, highlight: true },
  pos_multi_month: { id: 'pos_multi_month', label: 'POS Multi — 1 mois', price: 119, grantsDays: 31, cycle: 'month', includedTerminals: 99, includedBranches: 1 },
  pos_multi_year: { id: 'pos_multi_year', label: 'POS Multi — 1 an', price: 1190, grantsDays: 365, cycle: 'year', includedTerminals: 99, includedBranches: 1 },
}

// Per-unit supplements beyond the included quota.
export const POS_EXTRAS = {
  extra_terminal_month: { id: 'extra_terminal_month', label: 'Caisse supplémentaire', price: 15, unit: '/mois' },
  extra_terminal_year: { id: 'extra_terminal_year', label: 'Caisse supplémentaire', price: 150, unit: '/an' },
  extra_branch_month: { id: 'extra_branch_month', label: 'Branche supplémentaire', price: 25, unit: '/mois' },
  extra_branch_year: { id: 'extra_branch_year', label: 'Branche supplémentaire', price: 250, unit: '/an' },
}

// One-time hardware add-ons (decoupled from the subscription; prices to confirm).
export interface PosHardware {
  id: string
  label: string
  price: number
  desc: string
}

export const POS_HARDWARE: Record<string, PosHardware> = {
  printer_80mm: { id: 'printer_80mm', label: 'Imprimante ticket 80mm (USB/BT/LAN)', price: 220, desc: 'Imprimante thermique de comptoir.' },
  printer_58mm: { id: 'printer_58mm', label: 'Imprimante ticket 58mm portable (BT)', price: 150, desc: 'Imprimante mobile Bluetooth.' },
  cash_drawer: { id: 'cash_drawer', label: 'Tiroir-caisse', price: 130, desc: 'Déclenché par l’imprimante (RJ11).' },
  tablet: { id: 'tablet', label: 'Tablette Android 10"', price: 480, desc: 'Prête à l’emploi pour la caisse.' },
  scanner: { id: 'scanner', label: 'Lecteur code-barres (USB/BT)', price: 95, desc: 'Mode clavier, sans pilote.' },
  starter_bundle: { id: 'starter_bundle', label: 'Pack démarrage', price: 750, desc: 'Tablette + imprimante 80mm + tiroir (remise).' },
}

export const POS_LAUNCH_OFFER = 'Offre de lancement : 1er mois offert · annuel = 2 mois offerts.'
