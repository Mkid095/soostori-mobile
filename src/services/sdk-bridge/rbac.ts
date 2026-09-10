// src/services/sdk-bridge/rbac.ts
//
// Mobile RBAC enforcement — Phase 04.
//
// Maps coarse Mobile permission names to the fine-grained SDK capability names
// expected by @soostori/auth.hasCapability / can. The SDK uses scoped names
// (e.g. inventory.create/update/delete) while Mobile uses aggregate names
// (e.g. inventory.edit = create+update). Without this mapping, enforcement
// would always fail for manager/attendant roles.

import { hasPermission, checkPermission } from '@soostori/auth'
import type { Member } from '@soostori/auth/permissions'
import { SoostoriError } from '@soostori/core'
import type { EmployeeRole } from '@soostori/core'

// Local alias for SDK Capability strings — avoids module-resolution issues with
// TypeScript 6.0's stricter re-export handling in declaration files.
// These must stay in sync with @soostori/auth CAPABILITIES values.
export type Capability = string

export class PermissionDeniedError extends SoostoriError {
  constructor(permission: string, role: string | null) {
    super('PERMISSION_DENIED', `Role "${role ?? 'none'}" lacks permission "${permission}"`)
  }
}

/**
 * Permission names used across the mobile app.
 * Coarse names that map to one or more fine-grained SDK capability names.
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
  TEAM_VIEW: 'team.view',
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
 * Maps coarse Mobile permission names → fine-grained SDK capability names.
 * These are used with @soostori/auth hasCapability/can.
 */
const CAPABILITY_PERMISSION_MAP: Record<string, Capability[]> = {
  [PERMISSIONS.POS_SELL]: ['sales.create', 'sales.refund'],
  [PERMISSIONS.INVENTORY_VIEW]: ['inventory.view'],
  [PERMISSIONS.INVENTORY_EDIT]: ['inventory.create', 'inventory.update'],
  [PERMISSIONS.INVENTORY_ADJUST]: ['inventory.adjust'],
  [PERMISSIONS.REPORTS_VIEW]: ['reports.view'],
  [PERMISSIONS.EXPENSES_MANAGE]: ['expenses.create', 'expenses.update', 'expenses.delete'],
  [PERMISSIONS.CUSTOMERS_MANAGE]: ['customers.create', 'customers.update', 'customers.delete'],
  [PERMISSIONS.DEBT_MANAGE]: ['debts.create', 'debts.update', 'debts.delete'],
  [PERMISSIONS.TEAM_MANAGE]: ['team.invite', 'team.update', 'team.remove'],
  [PERMISSIONS.TEAM_VIEW]: ['team.view'],
  [PERMISSIONS.SHOP_SETTINGS]: ['settings.update'],
  [PERMISSIONS.DEVICE_APPROVE]: ['devices.manage'],
  [PERMISSIONS.HOST_SHOULDER]: ['devices.manage'],
  [PERMISSIONS.AUDIT_VIEW]: ['reports.view'],
  [PERMISSIONS.SUBSCRIPTION_MANAGE]: ['business.update'],
  [PERMISSIONS.PRODUCT_PRICE_CHANGE]: ['products.update'],
  [PERMISSIONS.PRODUCT_DELETE]: ['products.archive'],
}

/**
 * Maps coarse Mobile permission names → fine-grained SDK legacy permission names.
 * (Used with the legacy hasPermission/checkPermission functions.)
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
  [PERMISSIONS.TEAM_VIEW]: ['team.view'],
  [PERMISSIONS.SHOP_SETTINGS]: ['settings.update'],
  [PERMISSIONS.DEVICE_APPROVE]: ['devices.manage'],
  [PERMISSIONS.HOST_SHOULDER]: ['devices.manage'],
  [PERMISSIONS.AUDIT_VIEW]: ['reports.view'],
  [PERMISSIONS.SUBSCRIPTION_MANAGE]: ['subscription.manage'],
  [PERMISSIONS.PRODUCT_PRICE_CHANGE]: ['inventory.update'],
  [PERMISSIONS.PRODUCT_DELETE]: ['inventory.delete'],
}

/**
 * Local capability check using the same resolution order as @soostori/auth:
 * 1. memberCapabilityOverrides takes absolute precedence
 * 2. Otherwise check role's default bundle via hasPermission
 */
function canMember(member: Member | null | undefined, capability: Capability): boolean {
  if (!member || !member.role) return false
  if (member.memberCapabilityOverrides) {
    // Use explicit key lookup to satisfy TS stricter index checks (TS 6.0)
    const overrides = member.memberCapabilityOverrides as Record<string, boolean>
    if (Object.hasOwn(overrides, capability)) {
      return Boolean(overrides[capability])
    }
  }
  return hasPermission(member.role, capability)
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

/**
 * Phase 04 — Enforce a coarse mobile permission using the SDK's canonical
 * `can(member, capability)` function.
 *
 * Takes a Member object (with role + optional memberCapabilityOverrides) and
 * a coarse permission name. Maps it to the corresponding SDK capability(ies)
 * and checks using the SDK's hasCapability/can.
 *
 * @param member      - Member object from the SDK (role + optional overrides)
 * @param permission  - coarse mobile permission name (e.g. PERMISSIONS.TEAM_MANAGE)
 * @throws PermissionDeniedError if the member lacks the capability
 */
export function enforceCapability(
  member: Member | null | undefined,
  permission: string,
): void {
  const caps = CAPABILITY_PERMISSION_MAP[permission]
  if (!caps) throw new PermissionDeniedError(permission, member?.role ?? null)

  const allowed = caps.some(c => canMember(member as Member | null, c))
  if (!allowed) throw new PermissionDeniedError(permission, member?.role ?? null)
}
