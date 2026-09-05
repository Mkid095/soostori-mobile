// src/services/sdk-bridge/rbac.ts
//
// Mobile RBAC enforcement.
//
// Maps coarse Mobile permission names to the fine-grained SDK permission names
// expected by @soostori/auth.hasPermission. The SDK uses scoped names
// (e.g. inventory.create/update/delete) while Mobile uses aggregate names
// (e.g. inventory.edit = create+update). Without this mapping, enforcement
// would always fail for manager/attendant roles.

import { hasPermission, checkPermission } from '@soostori/auth'
import { SoostoriError } from '@soostori/core'
import type { EmployeeRole } from '@soostori/core'

export class PermissionDeniedError extends SoostoriError {
  constructor(permission: string, role: string | null) {
    super('PERMISSION_DENIED', `Role "${role ?? 'none'}" lacks permission "${permission}"`)
  }
}

/**
 * Permission names used across the mobile app.
 * Coarse names that map to one or more fine-grained SDK permission names.
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

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

/**
 * Maps coarse Mobile permission names → fine-grained SDK permission names.
 * Without this mapping, hasPermission() would always fail for non-owner roles
 * because the SDK uses scoped names (inventory.create/update/delete) while
 * Mobile uses aggregate names (inventory.edit = create+update).
 */
const SDK_PERMISSION_MAP: Record<string, string[]> = {
  [PERMISSIONS.POS_SELL]: ['pos.sell', 'pos.refund'],
  [PERMISSIONS.INVENTORY_VIEW]: ['inventory.view'],
  [PERMISSIONS.INVENTORY_EDIT]: ['inventory.create', 'inventory.update'],
  [PERMISSIONS.INVENTORY_ADJUST]: ['inventory.update'],
  [PERMISSIONS.REPORTS_VIEW]: ['reports.view', 'reports.export'],
  [PERMISSIONS.EXPENSES_MANAGE]: ['expenses.create', 'expenses.update', 'expenses.delete'],
  [PERMISSIONS.CUSTOMERS_MANAGE]: ['customers.create', 'customers.update', 'customers.delete'],
  [PERMISSIONS.DEBT_MANAGE]: ['debts.create', 'debts.update', 'debts.delete'],
  [PERMISSIONS.TEAM_MANAGE]: ['employee.create', 'employee.update', 'employee.delete'],
  [PERMISSIONS.SHOP_SETTINGS]: ['settings.update'],
  [PERMISSIONS.DEVICE_APPROVE]: ['devices.manage'],
  [PERMISSIONS.HOST_SHOULDER]: ['devices.manage'],
  [PERMISSIONS.AUDIT_VIEW]: ['reports.view'],
  [PERMISSIONS.SUBSCRIPTION_MANAGE]: ['subscription.manage'],
  [PERMISSIONS.PRODUCT_PRICE_CHANGE]: ['inventory.update'],
  [PERMISSIONS.PRODUCT_DELETE]: ['inventory.delete'],
}

/**
 * Returns true when the role has the given coarse permission.
 * Uses the SDK's hasPermission after mapping to fine-grained names.
 */
export function roleHas(role: EmployeeRole | null | undefined, permission: string): boolean {
  const sdkPerms = SDK_PERMISSION_MAP[permission]
  if (!sdkPerms) return false
  // A role has the coarse permission if it has ANY of the fine-grained SDK perms
  return sdkPerms.some(p => hasPermission(role, p))
}

/**
 * Throws PermissionDeniedError when the role lacks the permission.
 * Use at the service/action boundary — NOT in components.
 */
export function enforcePermission(
  role: EmployeeRole | null | undefined,
  permission: string,
  overrides?: Record<string, boolean> | null,
): void {
  if (overrides) {
    const sdkPerms = SDK_PERMISSION_MAP[permission] ?? [permission]
    const allowed = sdkPerms.some(p =>
      checkPermission((role ?? 'attendant') as EmployeeRole, p, overrides),
    )
    if (!allowed) throw new PermissionDeniedError(permission, role ?? null)
  } else {
    if (!roleHas(role, permission)) throw new PermissionDeniedError(permission, role ?? null)
  }
}
