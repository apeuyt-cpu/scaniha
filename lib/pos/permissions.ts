// Scaniha POS — static role→permission matrix (code, not a SQL table; v1).
// A manager PIN can authorize a one-off override for an action above the
// cashier's role (recorded as authorized_by in the audit log).

import type { StaffRole } from './types'

export type PosAction =
  | 'sell'
  | 'void_line'
  | 'void_sale'
  | 'discount'
  | 'refund'
  | 'open_drawer'
  | 'open_shift'
  | 'close_shift'
  | 'cash_move'
  | 'view_reports'
  | 'manage_staff'
  | 'manage_catalog'
  | 'manage_branches'

const MATRIX: Record<StaffRole, PosAction[]> = {
  cashier: ['sell', 'open_drawer'],
  manager: ['sell', 'void_line', 'void_sale', 'discount', 'refund', 'open_drawer', 'open_shift', 'close_shift', 'cash_move', 'view_reports', 'manage_catalog'],
  owner: ['sell', 'void_line', 'void_sale', 'discount', 'refund', 'open_drawer', 'open_shift', 'close_shift', 'cash_move', 'view_reports', 'manage_staff', 'manage_catalog', 'manage_branches'],
}

/** Does this role grant the action directly? */
export function can(role: StaffRole | null | undefined, action: PosAction): boolean {
  if (!role) return false
  const list = MATRIX[role]
  return !!list && list.indexOf(action) !== -1
}

/** Actions that, if the actor lacks them, can be unlocked by a manager PIN override. */
export function needsOverride(role: StaffRole | null | undefined, action: PosAction): boolean {
  return !can(role, action)
}
