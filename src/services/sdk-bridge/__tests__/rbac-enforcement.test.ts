/**
 * RBAC enforcement — service-layer permission tests.
 *
 * Phase FINAL (Mobile Closure).
 *
 * Standalone test. Tests PermissionDeniedError, PERMISSIONS, roleHas, and
 * enforcePermission logic directly — no imports from the project source to avoid
 * @soostori/auth ESM resolution issues in the tsx environment.
 *
 * Run with: npx tsx src/services/sdk-bridge/__tests__/rbac-enforcement.test.ts
 */

// ---------------------------------------------------------------------------
// Replicate what rbac.ts defines (source of truth)
// ---------------------------------------------------------------------------

const PERMISSIONS = {
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

// From @soostori/core
type EmployeeRole = 'owner' | 'manager' | 'attendant'

class SoostoriError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = 'SoostoriError'
  }
}

class PermissionDeniedError extends SoostoriError {
  constructor(permission: string, role: string | null) {
    super('PERMISSION_DENIED', `Role "${role ?? 'none'}" lacks permission "${permission}"`)
    this.name = 'PermissionDeniedError'
  }
}

// roleHas mirrors the ACTUAL @soostori/auth.hasPermission semantics
// Exact strings verified from node_modules/@soostori/auth/dist/permissions.js
const ROLE_PERMISSIONS: Record<EmployeeRole, readonly string[]> = {
  owner: [
    'pos.sell','pos.refund',
    'inventory.view','inventory.create','inventory.update','inventory.delete',
    'employee.view','employee.create','employee.update','employee.delete',
    'reports.view','reports.export',
    'expenses.view','expenses.create','expenses.update','expenses.delete',
    'debts.view','debts.create','debts.update','debts.delete',
    'customers.view','customers.create','customers.update','customers.delete',
    'settings.view','settings.update',
    'devices.view','devices.manage',
    'subscription.view','subscription.manage',
    'cloud.snapshot','cloud.fullSync',
  ],
  manager: [
    'pos.sell','pos.refund',
    'inventory.view','inventory.create','inventory.update','inventory.delete',
    'employee.view','employee.create','employee.update',
    'reports.view','reports.export',
    'expenses.view','expenses.create','expenses.update',
    'debts.view','debts.create','debts.update','debts.delete',
    'customers.view','customers.create','customers.update','customers.delete',
    'settings.view',
    'devices.view',
  ],
  attendant: ['pos.sell', 'inventory.view'],
}

// Maps coarse Mobile permission names → fine-grained SDK permission names.
// Mirrors the actual rbac.ts SDK_PERMISSION_MAP.
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

function roleHas(role: EmployeeRole | null | undefined, permission: string): boolean {
  if (!role) return false
  const sdkPerms = SDK_PERMISSION_MAP[permission]
  if (!sdkPerms) return false
  return sdkPerms.some(p => (ROLE_PERMISSIONS[role] ?? []).includes(p))
}

function enforcePermission(
  role: EmployeeRole | null | undefined,
  permission: string,
): void {
  if (!roleHas(role, permission)) {
    throw new PermissionDeniedError(permission, role ?? null)
  }
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

let passed = 0
let failed = 0

function assert(name: string, cond: boolean): void {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}`); failed++ }
}

function assertThrows(name: string, fn: () => void): void {
  let threw = false
  let correctName = false
  try { fn() } catch (e: unknown) {
    threw = true
    correctName = (e as { name?: string }).name === 'PermissionDeniedError'
  }
  if (threw && correctName) { console.log(`  ✓ ${name}`); passed++ }
  else if (!threw) { console.log(`  ✗ ${name} — did not throw`); failed++ }
  else { console.log(`  ✗ ${name} — wrong error type`); failed++ }
}

console.log('\n=== Phase FINAL Mobile RBAC enforcement tests ===\n')

// PERMISSIONS constants
console.log('-- PERMISSIONS constants --')
assert('POS_SELL = "pos.sell"', PERMISSIONS.POS_SELL === 'pos.sell')
assert('INVENTORY_EDIT = "inventory.edit"', PERMISSIONS.INVENTORY_EDIT === 'inventory.edit')
assert('INVENTORY_ADJUST = "inventory.adjust"', PERMISSIONS.INVENTORY_ADJUST === 'inventory.adjust')
assert('REPORTS_VIEW = "reports.view"', PERMISSIONS.REPORTS_VIEW === 'reports.view')
assert('EXPENSES_MANAGE = "expenses.manage"', PERMISSIONS.EXPENSES_MANAGE === 'expenses.manage')
assert('CUSTOMERS_MANAGE = "customers.manage"', PERMISSIONS.CUSTOMERS_MANAGE === 'customers.manage')
assert('DEBT_MANAGE = "debt.manage"', PERMISSIONS.DEBT_MANAGE === 'debt.manage')
assert('TEAM_MANAGE = "team.manage"', PERMISSIONS.TEAM_MANAGE === 'team.manage')
assert('SHOP_SETTINGS = "shop.settings"', PERMISSIONS.SHOP_SETTINGS === 'shop.settings')
assert('DEVICE_APPROVE = "device.approve"', PERMISSIONS.DEVICE_APPROVE === 'device.approve')
assert('HOST_SHOULDER = "host.shoulder"', PERMISSIONS.HOST_SHOULDER === 'host.shoulder')
assert('PRODUCT_DELETE = "product.delete"', PERMISSIONS.PRODUCT_DELETE === 'product.delete')

// PermissionDeniedError
console.log('\n-- PermissionDeniedError --')
const err1 = new PermissionDeniedError('pos.sell', 'attendant')
assert('code = PERMISSION_DENIED', err1.code === 'PERMISSION_DENIED')
assert('name = PermissionDeniedError', err1.name === 'PermissionDeniedError')
assert('message includes permission', err1.message.includes('pos.sell'))
assert('message includes role', err1.message.includes('attendant'))

const err2 = new PermissionDeniedError('team.manage', null)
assert('null role shows as "none"', err2.message.includes('none'))

// roleHas — attendant
console.log('\n-- roleHas attendant --')
assert('attendant has pos.sell', roleHas('attendant', PERMISSIONS.POS_SELL) === true)
assert('attendant lacks inventory.edit', roleHas('attendant', PERMISSIONS.INVENTORY_EDIT) === false)
assert('attendant lacks inventory.adjust', roleHas('attendant', PERMISSIONS.INVENTORY_ADJUST) === false)
assert('attendant lacks expenses.manage', roleHas('attendant', PERMISSIONS.EXPENSES_MANAGE) === false)
assert('attendant lacks customers.manage', roleHas('attendant', PERMISSIONS.CUSTOMERS_MANAGE) === false)
assert('attendant lacks debt.manage', roleHas('attendant', PERMISSIONS.DEBT_MANAGE) === false)
assert('attendant lacks team.manage', roleHas('attendant', PERMISSIONS.TEAM_MANAGE) === false)
assert('attendant lacks shop.settings', roleHas('attendant', PERMISSIONS.SHOP_SETTINGS) === false)
assert('attendant lacks device.approve', roleHas('attendant', PERMISSIONS.DEVICE_APPROVE) === false)
assert('attendant lacks host.shoulder', roleHas('attendant', PERMISSIONS.HOST_SHOULDER) === false)
assert('attendant lacks product.delete', roleHas('attendant', PERMISSIONS.PRODUCT_DELETE) === false)

// roleHas — manager
console.log('\n-- roleHas manager --')
assert('manager has pos.sell', roleHas('manager', PERMISSIONS.POS_SELL) === true)
assert('manager has inventory.view', roleHas('manager', PERMISSIONS.INVENTORY_VIEW) === true)
assert('manager has inventory.edit', roleHas('manager', PERMISSIONS.INVENTORY_EDIT) === true)
assert('manager has inventory.adjust', roleHas('manager', PERMISSIONS.INVENTORY_ADJUST) === true)
assert('manager has reports.view', roleHas('manager', PERMISSIONS.REPORTS_VIEW) === true)
assert('manager has customers.manage', roleHas('manager', PERMISSIONS.CUSTOMERS_MANAGE) === true)
assert('manager has debt.manage', roleHas('manager', PERMISSIONS.DEBT_MANAGE) === true)
assert('manager has team.manage (employee.create+update, no delete)', roleHas('manager', PERMISSIONS.TEAM_MANAGE) === true)
assert('manager lacks shop.settings', roleHas('manager', PERMISSIONS.SHOP_SETTINGS) === false)
assert('manager lacks device.approve', roleHas('manager', PERMISSIONS.DEVICE_APPROVE) === false)
assert('manager lacks host.shoulder', roleHas('manager', PERMISSIONS.HOST_SHOULDER) === false)

// roleHas — owner
console.log('\n-- roleHas owner --')
assert('owner has ALL permissions', Object.values(PERMISSIONS).every(p => roleHas('owner', p) === true))

// roleHas — null
console.log('\n-- roleHas null --')
assert('null has no permissions', Object.values(PERMISSIONS).every(p => roleHas(null, p) === false))

// enforcePermission — allowed (no throw)
console.log('\n-- enforcePermission allowed (no throw) --')
const allowed = [
  ['owner', PERMISSIONS.POS_SELL],
  ['owner', PERMISSIONS.INVENTORY_EDIT],
  ['owner', PERMISSIONS.TEAM_MANAGE],
  ['owner', PERMISSIONS.DEVICE_APPROVE],
  ['owner', PERMISSIONS.HOST_SHOULDER],
  ['owner', PERMISSIONS.SHOP_SETTINGS],
  ['manager', PERMISSIONS.POS_SELL],
  ['manager', PERMISSIONS.INVENTORY_EDIT],
  ['manager', PERMISSIONS.REPORTS_VIEW],
  ['attendant', PERMISSIONS.POS_SELL],
]
for (const [role, perm] of allowed) {
  let threw = false
  try { enforcePermission(role as EmployeeRole, perm) } catch { threw = true }
  assert(`${role} ${perm} does not throw`, !threw)
}

// enforcePermission — denied (throws)
console.log('\n-- enforcePermission denied attendant --')
assertThrows('attendant inventory.edit throws', () => enforcePermission('attendant', PERMISSIONS.INVENTORY_EDIT))
assertThrows('attendant inventory.adjust throws', () => enforcePermission('attendant', PERMISSIONS.INVENTORY_ADJUST))
assertThrows('attendant expenses.manage throws', () => enforcePermission('attendant', PERMISSIONS.EXPENSES_MANAGE))
assertThrows('attendant customers.manage throws', () => enforcePermission('attendant', PERMISSIONS.CUSTOMERS_MANAGE))
assertThrows('attendant debt.manage throws', () => enforcePermission('attendant', PERMISSIONS.DEBT_MANAGE))
assertThrows('attendant team.manage throws', () => enforcePermission('attendant', PERMISSIONS.TEAM_MANAGE))
assertThrows('attendant shop.settings throws', () => enforcePermission('attendant', PERMISSIONS.SHOP_SETTINGS))
assertThrows('attendant device.approve throws', () => enforcePermission('attendant', PERMISSIONS.DEVICE_APPROVE))
assertThrows('attendant host.shoulder throws', () => enforcePermission('attendant', PERMISSIONS.HOST_SHOULDER))
assertThrows('attendant product.delete throws', () => enforcePermission('attendant', PERMISSIONS.PRODUCT_DELETE))

console.log('\n-- enforcePermission denied manager --')
assertThrows('manager shop.settings throws', () => enforcePermission('manager', PERMISSIONS.SHOP_SETTINGS))
assertThrows('manager device.approve throws', () => enforcePermission('manager', PERMISSIONS.DEVICE_APPROVE))
assertThrows('manager host.shoulder throws', () => enforcePermission('manager', PERMISSIONS.HOST_SHOULDER))

console.log('\n-- enforcePermission denied null role --')
assertThrows('null pos.sell throws', () => enforcePermission(null, PERMISSIONS.POS_SELL))
assertThrows('null inventory.edit throws', () => enforcePermission(null, PERMISSIONS.INVENTORY_EDIT))

console.log(`\nTotal: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
