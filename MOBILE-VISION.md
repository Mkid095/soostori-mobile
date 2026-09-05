# Soostori Mobile — Vision & Architecture

**Document status:** Architecture baseline
**App:** Soostori Mobile
**Platform:** Android / iOS (Expo SDK 57 + React Native 0.86)
**Code:** `soostori-mobile` repository

---

## 1. What the App Is

Soostori Mobile is a **standalone offline-first POS application** for Android and iOS. It is one of the client applications of the Soostori Business Platform.

> The mobile app does NOT connect to any backend directly. When the backend is ready, an API sync layer is added — the SQLite schema and sync queue are already designed for it.

**Core promise:**

> Run the business quickly and reliably from anywhere, even when the internet is unavailable, while keeping business data synchronized across authorized devices.

---

## 2. Application Tabs

The mobile app has bottom-tab navigation with the following screens:

| Tab | Screen | Purpose |
|-----|---------|---------|
| POS | `pos.tsx` | Fast product grid, cart, checkout (cash / M-Pesa / debt) |
| Inventory | `inventory.tsx` | Product list, add/edit/delete, stock adjustments, low-stock alerts |
| Reports | `reports.tsx` | Daily sales summary, payment method breakdown |
| Debt | `debt.tsx` | Customer debt tracking, record payments |
| Settings | `settings.tsx` | Shop info, hardware config, team, sync, device management |
| Expenses | `expenses.tsx` | Expense tracking |
| Clients | `clients.tsx` | Client management |
| Customers | `customers.tsx` | Customer management |
| Dashboard | `dashboard.tsx` | Manager/owner dashboard |
| Approvals | `approvals.tsx` | Pending device pairing requests |
| Sales History | `sales-history.tsx` | Sale history |
| Receipts | `receipts.tsx` | Receipt history |
| Scan | `scan.tsx` | Barcode scanner |
| Sell | `sell.tsx` | Alternative sell screen |
| Stock | `stock.tsx` | Stock management |
| Receive | `receive.tsx` | Receive inventory |
| Support | `support.tsx` | Support |
| Notifications | `notifications.tsx` | Notification inbox |
| Low Stock | `low-stock.tsx` | Low stock alerts |

---

## 3. Core Architecture Principles

### 3.1 Offline-First

Every write operation:
1. Saves to local `expo-sqlite` immediately — instant UI
2. Inserts into `sync_queue` table for future backend sync

No backend calls are made until Phase 2. The `sync_queue` table is ready — when the backend is connected, a sync worker processes the queue.

### 3.2 No Business Logic in Components

UI components must **never** contain API calls, validation, or business logic. All business logic lives in `src/services/`. Components only render and emit events.

### 3.3 TypeScript Strict Mode

No `any`, no implicit `any`. `npx tsc --noEmit` must always pass.

### 3.4 Permission Enforcement at Service Boundary

RBAC enforcement happens at the **service layer**, not in components. Every mutation function calls `enforcePermission(role, permission)` before executing. Components are completely unaware of permission logic.

---

## 4. Database Schema

SQLite via `expo-sqlite`. Schema mirrors `soostori-desktop`:

### Core POS tables

```sql
products (id, category_id, category_name, category_color, name, sku, barcode,
          image_url, cost_price, selling_price, discount_price, unit,
          stock_quantity, current_stock, low_stock_threshold,
          track_inventory, allow_single_unit_sale, distributor_name,
          distributor_phone, units_per_package, box_buying_price,
          group_prices, is_active, created_at, updated_at)

categories (id, name, color, description, is_active, created_at, updated_at)

sales (id, type, status, subtotal, discount_amount, total_amount, paid_amount,
       payment_method, note, customer_id_number, items, items_summary,
       shop_id, employee_id, device_id, created_at, updated_at)

sale_items (id, sale_id, product_id, variation_name, product_name, quantity,
            unit_price, discount, total_price, created_at)

held_sales (id, name, cart_items, payment_method)

stock_movements (id, product_id, product_name, type, quantity, balance_after,
                 reason, reference_id, created_at, updated_at)

customers (id, name, phone, id_number, is_active, created_at, updated_at)

debts (id, customer_id, customer_name, customer_phone, sale_id, amount,
       amount_paid, status, due_date, notes, created_at, updated_at)

debt_payments (id, debt_id, amount, payment_method, reference, notes, created_at)

shop_settings (id, shop_name, address, phone, currency, receipt_footer,
               receipt_prefix, low_stock_threshold, mpesa_send_money_phone,
               mpesa_paybill_number, mpesa_paybill_account, bank_paybill_number,
               bank_paybill_account, mpesa_pochi_phone,
               enabled_payment_channels, biometric_enabled, updated_at)

sync_queue (id, shop_id, table_name, action, payload, status, created_at,
            synced_at, retry_count, retry_at)

expense_categories (id, name, color, icon, is_active)

expenses (id, category_id, amount, description, reference, date,
          created_at, updated_at)

product_variants (id, product_id, name, sku, barcode, cost_price, selling_price,
                  stock_quantity, is_active, created_at, updated_at)

notifications (id, type, title, body, data, is_read, created_at)

audit_logs (id, shop_id, employee_id, device_id, action, entity_type,
            entity_id, old_value, new_value, reason, event_id,
            event_name, actor_type, timestamp)
```

### Team/Sync tables

```sql
shops (id, name, cloud_shop_id, cloud_owner_id, is_cloud_shop)

employees (id, shop_id, name, email, phone, pin_hash, pin_salt, role,
           is_active, cloud_employee_id, cloud_sync_status, created_at, updated_at)

invitations (id, shop_id, employee_id, code, expires_at, used_at)

devices (id, shop_id, employee_id, device_name, device_type, is_host,
         last_seen, capabilities, cloud_device_id, cloud_registered,
         cloud_registered_at, created_at)

device_pairings (id, shop_id, device_id, requested_by, approved_by,
                 approved_at, status, created_at)

sync_events (id, shop_id, device_id, sequence_number, event_type,
             payload, timestamp)

sync_state (id, shop_id, last_sync_at, pending_events, device_count,
            active_device_count)

sync_conflicts (id, shop_id, sale_id, device_id, conflict_type, status,
                original_payload, resolution, resolved_by, created_at)
```

---

## 5. Service Architecture

All business logic lives in `src/services/`. File naming follows `[domain]-[action]-type.ts` — no helpers.ts, common.ts, utils.ts.

### Core CRUD services

| File | Responsibility |
|------|----------------|
| `db-products.ts` | Product CRUD + adjustStock |
| `db-sales.ts` | Sale CRUD + holdSale + receipt history |
| `db-customers.ts` | Customer CRUD |
| `db-debts.ts` | Debt CRUD + recordDebtPayment |
| `db-expenses.ts` | Expense CRUD |
| `db-expense-categories.ts` | Expense category CRUD |
| `db-categories.ts` | Category CRUD |
| `db-employees.ts` | Employee CRUD + PBKDF2 PIN hash/verify |
| `db-devices.ts` | Device CRUD |
| `db-pairings.ts` | Device pairing request/approve/reject |
| `db-settings.ts` | Shop settings CRUD |
| `db-backup.ts` | Backup/restore |
| `db-barcode.ts` | Barcode lookup |
| `db-receipts.ts` | Receipt data access |
| `db-audit.ts` | Audit log writer (logAudit) |
| `db-inventory-transactions.ts` | Inventory ledger (event sourcing) |
| `db-shops.ts` | Shop CRUD |
| `db-sync-state.ts` | Sync state management |
| `db-conflicts.ts` | Sync conflict tracking |
| `db-device-recovery.ts` | New device detection + cloud recovery |

### SDK Bridge (`src/services/sdk-bridge/`)

The SDK bridge wires `@soostori/*` SDK packages into the mobile app.

| File | Responsibility |
|------|----------------|
| `rbac.ts` | `PERMISSIONS` const + `roleHas()` + `enforcePermission()`; coarse→fine-grained permission mapping via `SDK_PERMISSION_MAP` |
| `sdk-event-bus.ts` | `publishSdkEvent<K>()` publishes canonical SoostoriEvent to SDK bus |
| `sdk-notifications.ts` | Subscribes to SDK event bus; fans out to local `notifications` table (workaround for missing `@soostori/notifications`) |
| `sdk-audit-recorder.ts` | Wires `@soostori/audit.AuditRecorder` to SDK event bus |
| `sdk-audit-storage.ts` | `mobileAuditStorage` implementing `AuditStorage`; writes to `audit_logs` table |
| `subscription-gate.ts` | `enforceSubscriptionOrThrow()` wraps `@soostori/subscription.enforceSubscription` |
| `bootstrap.ts` | `attachSdkBridges()` — one-call entry point for app/_layout |
| `sdk-bridge-types.ts` | Re-exports all 67 canonical event names from `@soostori/events` |

### Sync/Cloud services

| File | Responsibility |
|------|----------------|
| `cloud-auth.ts` | Magic code auth via `@fidscript/instant-react`; session caching; resolveSubscription |
| `cloud-snapshot.ts` | Cloud snapshot download/upload via InstantDB |
| `cloud-sync-api.ts` | Cloud sync API |
| `sync-queue-helper.ts` | `queueSync()`, `getSyncStatus()`, `markSyncEventRetryable()` |
| `sync-queue-processor.ts` | Processes sync queue with exponential backoff (1min → 5min → 15min, 3 retries max) |
| `sync-emitter.ts` | Emits sync events |
| `sync-cursor.ts` | Sync cursor management |
| `lan-server.ts` | LAN WebSocket server (desktop) |
| `lan-client.ts` | LAN WebSocket client (mobile) |

### Adapter services (`src/services/adapters/`)

Adapters implement SDK contracts over mobile-specific infrastructure.

| Path | Adapter | Implements |
|------|---------|------------|
| `auth/session-storage.ts` | `AsyncStorageSessionStorage` | `@soostori/auth` session contract |
| `storage/expo-sqlite-repository.ts` | `ExpoSqliteRepository<T>` | `@soostori/storage.Repository<T>` |
| `sales/mobile-sales-repository.ts` | `MobileSalesRepository` | SalesRepository |
| `inventory/mobile-inventory-repository.ts` | `MobileInventoryRepository` | InventoryRepository |
| `customers/mobile-customers-repository.ts` | `MobileCustomersRepository` | CustomersRepository |
| `debts/mobile-debts-repository.ts` | `MobileDebtsRepository` | DebtsRepository |
| `devices/mobile-primary-coordinator.ts` | `MobilePrimaryCoordinator` | `@soostori/devices.PrimaryDeviceCoordinator` (15s stale, 60s lost heartbeat) |
| `offline/mobile-offline-state.ts` | `MobileOfflineState` | `@soostori/offline.computeOfflineState` (3-day grace) |
| `sync/mobile-offline-queue.ts` | `MobileOfflineQueue` | Offline queue over SQLite |
| `sync/mobile-sync-integration.ts` | `MobileSyncIntegration` | LAN sync integration with Primary authorization gate |

---

## 6. RBAC Permission Model

### Permission names (coarse)

Defined in `src/services/sdk-bridge/rbac.ts` as `PERMISSIONS`:

```typescript
POS_SELL: 'pos.sell'
INVENTORY_VIEW: 'inventory.view'
INVENTORY_EDIT: 'inventory.edit'
INVENTORY_ADJUST: 'inventory.adjust'
REPORTS_VIEW: 'reports.view'
EXPENSES_MANAGE: 'expenses.manage'
CUSTOMERS_MANAGE: 'customers.manage'
DEBT_MANAGE: 'debt.manage'
TEAM_MANAGE: 'team.manage'
SHOP_SETTINGS: 'shop.settings'
DEVICE_APPROVE: 'device.approve'
HOST_SHOULDER: 'host.shoulder'
AUDIT_VIEW: 'audit.view'
SUBSCRIPTION_MANAGE: 'subscription.manage'
PRODUCT_PRICE_CHANGE: 'product.price_change'
PRODUCT_DELETE: 'product.delete'
```

### Coarse → Fine-grained mapping

`SDK_PERMISSION_MAP` in `rbac.ts` maps coarse names to SDK fine-grained permission names:

```typescript
INVENTORY_EDIT: ['inventory.create', 'inventory.update']
TEAM_MANAGE: ['employee.create', 'employee.update', 'employee.delete']
DEVICE_APPROVE: ['devices.manage']
-- etc.
```

`roleHas(role, permission)` returns `true` if the role has **any** of the mapped fine-grained permissions.

### Roles (from `@soostori/auth`)

- **owner** — full access including billing, team management, device approval
- **manager** — inventory + reports + team management (no billing)
- **attendant** — POS-only access

### Current enforcement call sites

| Service | Function | Permission |
|---------|----------|------------|
| `db-sales.ts` | `createSale`, `createSaleOffline` | `POS_SELL` |
| `db-products.ts` | `createProduct`, `updateProduct` | `INVENTORY_EDIT` |
| `db-products.ts` | `deleteProduct` | `PRODUCT_DELETE` |
| `db-products.ts` | `adjustStock` | `INVENTORY_ADJUST` |
| `db-expenses.ts` | `createExpense`, `updateExpense`, `deleteExpense` | `EXPENSES_MANAGE` |
| `db-expense-categories.ts` | `createExpenseCategory`, `updateExpenseCategory`, `deleteExpenseCategory` | `EXPENSES_MANAGE` |
| `db-customers.ts` | `createCustomer`, `updateCustomer`, `deactivateCustomer` | `CUSTOMERS_MANAGE` |
| `db-debts.ts` | `createDebt`, `recordDebtPayment` | `DEBT_MANAGE` |
| `db-employees.ts` | `createEmployee`, `updateEmployeePin` | `TEAM_MANAGE` |
| `db-pairings.ts` | `approvePairing`, `rejectPairing` | `DEVICE_APPROVE` |
| `db-settings.ts` | `updateShopSettings` | `SHOP_SETTINGS` |
| `db-devices.ts` | `setDeviceHost` | `HOST_SHOULDER` |

### Session resolution

`getCurrentRole()` from `session-helper.ts` reads the current role from AsyncStorage (`@soostori:employeeRole`). This is set at login time and reflects the employee's role within the current shop.

---

## 7. SDK Packages Consumed

The mobile app consumes these SDK packages:

| Package | Purpose |
|---------|---------|
| `@soostori/core` | Common primitives, IDs, errors, offline grace constants |
| `@soostori/auth` | `hasPermission`, `checkPermission`, `AsyncStorageSessionStorage` |
| `@soostori/events` | All canonical Soostori event name constants |
| `@soostori/audit` | `AuditRecorder`, `AuditStorage` |
| `@soostori/offline` | `computeOfflineState` — ONLINE / OFFLINE_NORMAL / OFFLINE_WARNING / OFFLINE_LIMIT_EXCEEDED |
| `@soostori/subscription` | `enforceSubscription` |
| `@soostori/devices` | `PrimaryDeviceCoordinator` |
| `@fidscript/instant-react` | Cloud auth and sync via InstantDB |

### Known SDK gap

`@soostori/notifications` is not published on npm. A local workaround in `sdk-notifications.ts` subscribes to the SDK event bus and persists notifications to the local `notifications` table. When `@soostori/notifications` is published, it should replace this workaround with `NotificationManager.fromRules()`.

---

## 8. Authentication & Session

### Cloud auth (InstantDB)

Flow: `cloudSendMagicCode` → `cloudVerifyMagicCode` → resolves shop/employee/device in InstantDB → caches session in AsyncStorage.

Session keys in AsyncStorage:
- `@soostori:cloudToken` — InstantDB userId
- `@soostori:shopId` — current shop ID
- `@soostori:employeeId` — current employee ID
- `@soostori:employeeRole` — current employee role (owner/manager/attendant)

### Local PIN auth

Employee PIN uses PBKDF2-SHA256, 100,000 iterations, 32-byte random salt per user (stored in `employees.pin_salt`).

---

## 9. Subscription & Offline Policy

### 3-day offline boundary

Managed by `@soostori/offline` via `computeOfflineState()`:

```
ONLINE              — cloud reachable
OFFLINE_NORMAL      — < 3 days offline
OFFLINE_WARNING     — 2+ days offline (warning issued)
OFFLINE_LIMIT_EXCEEDED — 3+ days offline (POS operations blocked)
```

### Subscription gate

`enforceSubscriptionOrThrow()` in `subscription-gate.ts` is called at every mutation boundary. It wraps `@soostori/subscription.enforceSubscription` with `SubscriptionBlockedError`. Entitlement is cached with a 3-day verification deadline.

---

## 10. Synchronization

### Sync queue

Every write inserts into `sync_queue` table: `id, shop_id, table_name, action, payload, status, created_at, synced_at, retry_count, retry_at`.

Processed with exponential backoff: 1 minute → 5 minutes → 15 minutes (3 retries max before marking failed).

### Cloud sync

Via `@fidscript/instant-react` (appId: `0808ca7d-b0ba-4541-8906-48f7d0403950`). Shop/employee/device resolved and cached at login.

### LAN sync

`MobileSyncIntegration` pushes canonical SoostoriEvents over LAN WebSocket. Sale.* events are gated by `getMobilePrimaryStatus().canAuthorStockOps` — requires Primary Device to be online. If Primary Device is unavailable, stock-operating sales are rejected.

### Device recovery

New device detection in `app/_layout.tsx` → prompts to restore from cloud snapshot via `cloudDownloadSnapshot`.

---

## 11. SDK Event Bus

### Canonical events

Published via `publishSdkEvent<K>()` in `sdk-event-bus.ts`. Current implementation:

- `sale.completed` — emitted by `createSale` and `createSaleOffline` in `db-sales.ts` with `{ saleId, total }`

### Event consumers

- `AuditRecorder` — wired via `sdk-audit-recorder.ts`; records all events to `audit_logs` table
- `sdk-notifications.ts` — fans out 9 event types to local `notifications` table

### Available event types

`@soostori/events` re-exports 67 canonical event names including: `SALE_PENDING`, `SALE_CONFIRMED`, `SALE_REJECTED`, `SALE_REFUNDED`, `SALE_COMPLETED`, `STOCK_RECEIVED`, `STOCK_ADJUSTED`, `STOCK_TRANSFERRED`, `LOW_STOCK_DETECTED`, `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_DELETED`, `CUSTOMER_CREATED`, `CUSTOMER_FLAGGED`, `DEBT_CREATED`, `DEBT_PAYMENT_RECORDED`, `DEVICE_REGISTERED`, `DEVICE_OFFLINE`, `PRIMARY_DEVICE_LOST`, `SYNC_SNAPSHOT_DOWNLOADED`, `SUBSCRIPTION_EXPIRING_SOON`, `SUBSCRIPTION_EXPIRED`, etc.

---

## 12. Key Types

### Employee roles

```typescript
type EmployeeRole = 'owner' | 'manager' | 'attendant'
```

### Device types

```typescript
type DeviceType = 'desktop' | 'mobile' | 'tablet'
```

### Sale statuses

```typescript
type SaleStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled'
```

### Pairing statuses

```typescript
type PairingStatus = 'pending' | 'approved' | 'rejected'
```

### Inventory transaction types

```typescript
type InventoryTransactionType = 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'SALE_CANCELLED'
```

---

## 13. Test Suite

All tests run via `npx tsx` (not Jest — `@soostori/auth` is ESM-only and Jest cannot parse it).

| Suite | File | Count |
|-------|------|-------|
| SessionStorage | `adapters/auth/__tests__/session-storage.test.ts` | 5 |
| ExpoSQLite basic | `adapters/storage/__tests__/expo-sqlite-repository.basic.test.ts` | 7 |
| ExpoSQLite transaction | `adapters/storage/__tests__/expo-sqlite-repository.transaction.test.ts` | 3 |
| MobileOfflineState | `adapters/offline/__tests__/mobile-offline-state.test.ts` | 9 |
| MobilePrimaryCoordinator | `adapters/devices/__tests__/mobile-primary-coordinator.test.ts` | 12 |
| MobileQueueStorage | `adapters/sync/__tests__/mobile-queue-storage.test.ts` | 14 |
| MobileSyncIntegration | `adapters/sync/__tests__/mobile-sync-integration.test.ts` | 14 |
| MobileSalesRepository | `adapters/sales/__tests__/mobile-sales-repository.test.ts` | 10 |
| RBAC enforcement | `sdk-bridge/__tests__/rbac-enforcement.test.ts` | 66 |

**Total: 140 tests passing.**

---

## 14. Application Startup Sequence

`app/_layout.tsx` initializes in order:

1. Initialize SQLite database via `useDatabase` hook
2. Check grace window (offline entitlement deadline)
3. Check for new device → prompt for cloud recovery if needed
4. Mount auth gate (require login if no session)
5. Call `attachSdkBridges()` — wires audit recorder + notification fan-out to SDK event bus

---

## 15. File Naming Conventions

Following ANPAS standard:

| Pattern | Example | Purpose |
|---------|---------|---------|
| `db-[domain].ts` | `db-products.ts` | Database operations |
| `[domain]-[action]-type.ts` | `db-products-mapper.ts` | Row mappers |
| `sdk-[purpose].ts` | `sdk-event-bus.ts` | SDK bridge implementations |
| `[purpose]-helper.ts` | `sync-queue-helper.ts` | Helper utilities |
| `[domain]-repository.ts` | `mobile-sales-repository.ts` | SDK adapter implementations |

**Forbidden:** `helpers.ts`, `common.ts`, `utils.ts`, `tools.ts`.

---

## 16. SDK Contract Adapters

The mobile app implements the following SDK contracts via adapters:

- `@soostori/auth` → `AsyncStorageSessionStorage`
- `@soostori/storage` → `ExpoSqliteRepository<T>`
- `@soostori/devices` → `MobilePrimaryCoordinator`
- `@soostori/offline` → `MobileOfflineState`
- `SalesRepository` → `MobileSalesRepository`
- `InventoryRepository` → `MobileInventoryRepository`
- `CustomersRepository` → `MobileCustomersRepository`
- `DebtsRepository` → `MobileDebtsRepository`
- `OfflineQueue` → `MobileOfflineQueue`
- `SyncIntegration` → `MobileSyncIntegration`
- `AuditStorage` → `mobileAuditStorage`

---

## 17. Known Limitations

1. **`@soostori/notifications` not published** — workaround in `sdk-notifications.ts` fans out to local table. Replace when package is published.
2. **LAN sync requires Primary Device** — sale events cannot be authored when Primary Device is offline. This is intentional to prevent stock conflicts.
3. **Cloud sync is Phase 2** — currently only sync queue is prepared. Backend API integration not yet implemented.
4. **Desktop-only host** — mobile cannot act as host device. Enforced by `device_type` restriction in `setDeviceHost`.
5. **Attendant role** — has `pos.sell` + `inventory.view` only. Cannot access any management functions.
