// src/services/sdk-bridge/rbac.ts
//
// Mobile RBAC enforcement.
//
// Consumes @soostori/auth.hasPermission and exposes a guard that blocks
// permission-sensitive operations at the service layer. The UI may also
// hide controls, but the service boundary is the source of truth.

import { hasPermission, checkPermission } from '@soostori/auth'
import { SoostoriError } from '@soostori/core'
import type { EmployeeRole } from '@soostori/core'

export class PermissionDeniedError extends SoostoriError {
  constructor(permission: string, role: string | null) {
    super('PERMISSION_DENIED', `Role "${role ?? 'none'}" lacks permission "${permission}"`)
  }
}

/**
 * Returns true when the role has the given permission using the SDK defaults.
 */
export function roleHas(role: EmployeeRole | null | undefined, permission: string): boolean {
  return hasPermission(role, permission)
}

/**
 * Throws PermissionDeniedError when the role lacks the permission.
 *
 * Use this at the service/action boundary — NOT in components.
 */
export function enforcePermission(
  role: EmployeeRole | null | undefined,
  permission: string,
  overrides?: Record<string, boolean> | null,
): void {
  const allowed = overrides
    ? checkPermission((role ?? 'attendant') as EmployeeRole, permission, overrides)
    : hasPermission(role, permission)
  if (!allowed) throw new PermissionDeniedError(permission, role ?? null)
}

/**
 * Permission names used across the mobile app.
 *
 * Keep aligned with Desktop — if Desktop adds a new permission, mirror it here.
 */
export const PERMISSIONS = {
  POS_SELL: 'pos.sell',
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_EDIT: 'inventory.edit',
  INVENTORY_ADJUST: 'inventory.adjust',
  REPORTS_VIEW: 'reports.view',
  EXPENSES_MANAGE: 'expenses.manage',
  CUSTOMERS_MANAGE: 'customers.manage',
  DEBT_MANAGE: 'debt.manage',
  TEAM_MANAGE: 'team.manage',
  SHOP_SETTINGS: 'shop.settings',
  DEVICE_APPROVE: 'device.approve',
  HOST_SHOULDER: 'host.shoulder',
  AUDIT_VIEW: 'audit.view',
  SUBSCRIPTION_MANAGE: 'subscription.manage',
  PRODUCT_PRICE_CHANGE: 'product.price_change',
  PRODUCT_DELETE: 'product.delete',
} as const

export type PermissionName = typeof PERMISSIONS[keyof typeof PERMISSIONS]
