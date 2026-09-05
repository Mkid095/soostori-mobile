# MOBILE VISION ALIGNMENT REPORT

**Date:** 2026-09-05
**Scope:** 28 capability areas — Business Operations, Platform Services, Product Architecture
**Methodology:** Read-only file analysis across ~60 source files; no edits; no tests disrupted
**Baseline status:** RBAC enforcement locked (140/140 tests passing, TypeScript clean)

---

## EXECUTIVE SUMMARY

The mobile codebase is a **technically healthy foundation with significant product vision gaps**. The RBAC closure is solid. The offline architecture is structurally correct. However, several critical product capabilities are either missing enforcement, partially implemented, or architecturally disconnected from the SDK event bus and subscription gate.

**The mobile app is NOT merely a POS.** It is correctly positioned as a portable operational + management client. But the implementation does not yet fully reflect this across all business domains.

---

## 1. CURRENT MOBILE PRODUCT ROLE

Mobile is a **portable operational and management client** of the Soostori Business Platform.

It supports: POS, products, inventory, customers, debts, expenses, sales history, reports, dashboard, notifications, team/device workflows, barcode scanning, offline operation, LAN participation, and cloud synchronization/recovery.

**Vision says:** Mobile should include all operational and management workflows appropriate to mobile.
**Current state:** Structurally correct role, but several capabilities are partial or unguarded.

---

## 2. CAPABILITIES THAT MATCH THE MASTER VISION

| Capability | Status | Evidence |
|-----------|--------|----------|
| POS / Selling | ✅ COMPLETE | `pos.tsx`, `sell.tsx`; cash/debt/M-Pesa/paybill; LAN-aware checkout |
| Products (full CRUD) | ✅ COMPLETE | name, sku, barcode, category, pricing, distributor, variants, group prices |
| Inventory ledger pattern | ✅ COMPLETE | `db-inventory-transactions.ts` — immutable movements + derived `current_stock` cache |
| Expenses (full CRUD + categories) | ✅ COMPLETE | `db-expenses.ts`, `db-expense-categories.ts`; RBAC enforced |
| Sales history + receipts | ✅ COMPLETE | `db-receipts.ts`, `getReceiptHistory()`, receipt re-print |
| Barcode scanning | ✅ COMPLETE | `expo-camera` + `BarcodeScannerModal` integrated in POS |
| Dashboard (real numbers) | ✅ COMPLETE | `getTodaySales()`, `getLowStockProducts()` — no demo data |
| Device pairing flow | ✅ COMPLETE | `requestPairing` → `approvePairing`/`rejectPairing`; Approvals screen |
| Notifications (local fan-out) | ✅ COMPLETE | `sdk-notifications.ts`; 9 event types; inbox UI |
| Audit logging | ✅ COMPLETE | `logAudit()` + `AuditRecorder` wired to SDK bus |
| Settings (full config) | ✅ COMPLETE | Shop name, M-Pesa, payment channels, biometric, receipt |
| SDK packages installed | ✅ COMPLETE | All `@soostori/*` packages wired via adapters |
| Local adapters (all wired) | ✅ COMPLETE | All adapters in `src/services/adapters/` connected to app |
| Dual auth (magic code + PIN) | ✅ COMPLETE | InstantDB magic code + PBKDF2 PIN |
| Conflict handling infrastructure | ✅ COMPLETE | `db-conflicts.ts`; partial fulfill/cancel/escalate |
| Reports (daily/payment breakdown) | ✅ COMPLETE | Date filters; payment method stats; no demo data |

---

## 3. CAPABILITIES NARROWER THAN THE VISION

### 3.1 Subscription enforcement not universal

**Vision:** Subscription gate should block all paid operations when entitlement is absent or expired.
**Current:** `enforceSubscriptionOrThrow()` is called **only** in `createSale` and `createSaleOffline`. All other mutation services (`createProduct`, `updateProduct`, `deleteProduct`, `adjustStock`, `createCustomer`, `updateCustomer`, `createDebt`, `recordDebtPayment`, `createExpense`, `createExpenseCategory`, `updateShopSettings`) do **not** call it.

A user with an expired subscription can still add products, record debts, and update settings on mobile while offline.

**Affected files:** `db-products.ts`, `db-customers.ts`, `db-debts.ts`, `db-expenses.ts`, `db-expense-categories.ts`, `db-settings.ts`, `db-product-variants.ts`
**Severity:** HIGH
**Belongs to:** Mobile (subscription gate wiring)

### 3.2 Primary Device gating only in LAN sync path, not local sale creation

**Vision:** When Primary Device is unavailable, no device should independently authorize stock-mutating sales.
**Current:** `MobileSyncIntegration.tryPush()` gates `sale.*` events on `isPrimaryOnline()`. However, `createSale()` and `createSaleOffline()` in `db-sales.ts` do **not** check `getMobilePrimaryStatus()` before completing the sale locally. A device with no LAN connection could process a sale that conflicts with another device's simultaneous sale.

**Affected file:** `src/services/db-sales.ts`
**Severity:** HIGH
**Belongs to:** Mobile (sale creation should check Primary status when LAN is reachable)

### 3.3 SDK event bus only emits `sale.completed`

**Vision:** Business modules generate events; platform services react. Every significant mutation should publish its event.
**Current:** Only `sale.completed` is published via `publishSdkEvent()`. `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `CUSTOMER_CREATED`, `DEBT_CREATED`, `STOCK_ADJUSTED`, `EXPENSE_CREATED` are all **not** published. The AuditRecorder and notification fan-out only react to `sale.completed`.

**Affected files:** All mutation services — `db-products.ts`, `db-customers.ts`, `db-debts.ts`, `db-expenses.ts`, `db-product-variants.ts`
**Severity:** MEDIUM
**Belongs to:** Mobile (event emission wiring)

### 3.4 Sync queue processor may not be started

**Vision:** Every local write is queued and automatically synchronized.
**Current:** `queueSync()` writes to the table. `sync-queue-processor.ts` has `processSyncQueue()` and `startSyncWorker()`. But `startSyncWorker()` is defined and never called from any app initialization path. Queue entries accumulate but may not be drained automatically.

**Affected file:** `src/services/sync-queue-processor.ts`
**Severity:** MEDIUM
**Belongs to:** Mobile (processor startup wiring)

---

## 4. CAPABILITIES MISSING

### 4.1 Stock transfers

**Status:** MISSING
**Evidence:** No `TRANSFER` type in `InventoryTransactionType`. No `transferStock()` function anywhere.
**Vision requirement:** Inventory should support transfers between locations.
**Belongs to:** Mobile (new service function)

### 4.2 Stock reservations

**Status:** MISSING
**Evidence:** No `RESERVED`/`RELEASED` inventory transaction creation from mobile side. `STOCK_RESERVED`/`STOCK_RELEASED` events exist in `sdk-bridge-types.ts` but no implementation.
**Vision requirement:** Reserve stock during pending orders, release on cancel/fulfill.
**Belongs to:** Mobile

### 4.3 Customer flagging / cross-shop risk warning

**Status:** MISSING
**Evidence:** `CUSTOMER_FLAGGED` event exists in types. `customer.id_number` field exists. No flag/unflag logic in `db-customers.ts`. No cross-shop lookup.
**Vision requirement:** Optional cross-shop warning when an ID has been flagged elsewhere.
**Belongs to:** Mobile + SDK (SDK needs cross-shop lookup contract)

### 4.4 Debt write-off

**Status:** MISSING
**Evidence:** `DEBT_WRITTEN_OFF` constant in `sdk-bridge-types.ts`. No `writeOffDebt()` in `db-debts.ts`. No UI for write-off.
**Vision requirement:** Owner/manager can write off a debt as lost.
**Belongs to:** Mobile

### 4.5 Debt payment reminders

**Status:** MISSING
**Evidence:** `DEBT_PAYMENT_REMINDER` event in types. No `sdk-notifications.ts` rule for it. No reminder scheduling.
**Vision requirement:** Proactive debt reminders to customers.
**Belongs to:** Mobile + SDK (notification rules)

### 4.6 Invitation flow for employee enrollment

**Status:** MISSING
**Evidence:** `invitations` table in schema. `db-employees.ts` has no invitation creation or code-acceptance flow. `generateInvitation()`, `acceptInvitation()` do not exist.
**Vision requirement:** Owner generates 6-digit code; employee enters it on their device to join shop.
**Belongs to:** Mobile

### 4.7 Business / shop switching

**Status:** MISSING
**Evidence:** `db-shops.ts` only has `getShop()`, `getDefaultShop()`, `updateShopName()`. No shop picker UI. No `switchShop()` function.
**Vision requirement:** One owner with multiple businesses can switch between them on mobile.
**Belongs to:** Mobile

### 4.8 Team section in settings

**Status:** MISSING (partially built, not integrated)
**Evidence:** `team-section.tsx` component exists in `src/components/settings/`. Not rendered in `settings.tsx` modal. No employee list, role assignment, or activation.
**Vision requirement:** Owner/manager manages team from mobile.
**Belongs to:** Mobile (UI integration)

### 4.9 `cloudDownloadSnapshot()` implementation

**Status:** UNVERIFIED (not found in code read)
**Evidence:** `cloud-snapshot.ts` exists but the `cloudDownloadSnapshot()` function body was not found during audit.
**Vision requirement:** New device recovers full business state from cloud.
**Belongs to:** Mobile (verify + fix)

---

## 5. CAPABILITIES INCORRECTLY SCOPED

### 5.1 `pos.tsx` and `sell.tsx` are near-duplicates

**Issue:** Two screens with near-identical functionality. `pos.tsx` lacks the LAN sync UI that `sell.tsx` has. This suggests `pos.tsx` is the legacy screen and `sell.tsx` is the newer one, but both remain in the tab navigation.
**Affected file:** `app/(tabs)/pos.tsx`, `app/(tabs)/sell.tsx`
**Recommendation:** Consolidate into one canonical POS screen with full LAN sync UI.
**Belongs to:** Mobile

### 5.2 `clients.tsx` is a legacy re-export shim

**Issue:** `clients.tsx` re-exports from `customers.tsx`. Not a distinct business capability. Legacy.
**Affected file:** `app/(tabs)/clients.tsx`
**Recommendation:** Remove `clients.tsx` tab; keep only `customers.tsx`.
**Belongs to:** Mobile

### 5.3 Business isolation not enforced at DB query level

**Issue:** Most local queries use hardcoded `'default'` as `shopId`. `cloud-sync-api.ts` itself notes: "the `syncEvents` table currently lacks a `shopId` column — the shop boundary is enforced upstream by the write path." When multi-business is active, data isolation is not DB-enforced.
**Affected files:** Query layer in all db services
**Severity:** MEDIUM
**Belongs to:** Mobile + Cloud schema

---

## 6. RBAC GAPS

### 6.1 `db-product-variants.ts` — no RBAC enforcement

**Status:** HIGH severity
**Evidence:** `createVariant()`, `updateVariant()`, `deleteVariant()`, `adjustVariantStock()` — none call `enforcePermission()`.
**Impact:** Any authenticated user (including `attendant`) can mutate product variants without permission check.
**Affected file:** `src/services/db-product-variants.ts`
**Belongs to:** Mobile (fix)

### 6.2 `db-product-variants.ts` — no subscription enforcement

**Evidence:** None of the variant mutation functions call `enforceSubscriptionOrThrow()`.
**Belongs to:** Mobile (fix)

---

## 7. SDK GAPS

### 7.1 `@soostori/notifications` not published

**Status:** SDK BLOCKED
**Evidence:** `sdk-notifications.ts` is a local workaround that fans out to the local `notifications` table. When `@soostori/notifications` is published, replace with `NotificationManager.fromRules()`.
**Temporary workaround:** Local `sdk-notifications.ts` — acceptable, clearly documented, isolated.
**Belongs to:** SDK Agent (publish `@soostori/notifications`)

### 7.2 `DEBT_PAYMENT_REMINDER` notification rule missing

**Status:** SDK GAP (local)
**Evidence:** Event exists in `sdk-bridge-types.ts`. No rule in `sdk-notifications.ts`.
**Belongs to:** SDK Agent (define reminder event contract) + Mobile (wire rule)

### 7.3 Cross-shop customer risk lookup — no SDK contract

**Status:** SDK MISSING
**Evidence:** No `@soostori/customers` contract for cross-shop flag lookup.
**Belongs to:** SDK Agent (define cross-shop trust lookup)

---

## 8. DESKTOP / MOBILE / WEB RESPONSIBILITY CONFLICTS

No fundamental conflicts found. The three clients are architecturally separate with distinct roles:

- **Desktop:** Primary Device hosting, LAN server, high-speed POS, hardware integration
- **Mobile:** Portable POS, operational management, mobile workflows
- **Web:** Business control tower (not implemented in this repo)

The current implementation correctly keeps Desktop as LAN host and Mobile as LAN client.

---

## 9. CLOUD / LAN / OFFLINE INCONSISTENCIES

### 9.1 Sync queue processor not started

Described in section 4.4 above.

### 9.2 Primary Device gating gap

Described in section 3.2 above.

### 9.3 Offline state warning not blocking operations universally

`OFFLINE_LIMIT_EXCEEDED` is correctly computed by `computeOfflineState()`. But since most mutation services don't call `enforceSubscriptionOrThrow()`, the exceeded state does not block most operations — only `createSale`/`createSaleOffline` are blocked.

---

## 10. MULTI-BUSINESS INCONSISTENCIES

### 10.1 No shop switcher

An owner with two businesses cannot switch between them on mobile.

### 10.2 Hardcoded `'default'` shopId in queries

Real multi-business isolation is not enforced at the SQLite query level.

### 10.3 `cloud-sync-api.ts` note on missing shopId column

The cloud sync layer itself flags that `syncEvents` lacks a `shopId` column. This is a cloud schema gap that should be tracked.

---

## 11. EVENT / AUDIT / NOTIFICATION GAPS

| Event | Constant exists | Published | Notified | Audit logged |
|-------|----------------|-----------|----------|--------------|
| `sale.completed` | ✅ | ✅ | ✅ | ✅ |
| `PRODUCT_CREATED` | ✅ | ❌ | ❌ | ❌ |
| `PRODUCT_UPDATED` | ✅ | ❌ | ❌ | ❌ |
| `PRODUCT_DELETED` | ✅ | ❌ | ❌ | ❌ |
| `STOCK_ADJUSTED` | ✅ | ❌ | ❌ | ❌ |
| `CUSTOMER_CREATED` | ✅ | ❌ | ❌ | ❌ |
| `DEBT_CREATED` | ✅ | ❌ | ✅ | ❌ |
| `DEBT_PAYMENT_RECORDED` | ✅ | ❌ | ✅ | ❌ |
| `EXPENSE_CREATED` | ✅ | ❌ | ❌ | ❌ |
| `DEVICE_REGISTERED` | ✅ | ❌ | ❌ | ❌ |

**Root cause:** Only `db-sales.ts` calls `publishSdkEvent()`. All other mutation services bypass the SDK event bus.

---

## 12. RECOMMENDED IMPLEMENTATION PRIORITY

### Priority 1 — Security and correctness (do now)

| # | Task | Files | Reason |
|---|------|-------|--------|
| 1 | Add RBAC to `db-product-variants.ts` | `db-product-variants.ts` | Unguarded mutation — attendant can modify variants |
| 2 | Add subscription gate to all mutation services | `db-products.ts`, `db-customers.ts`, `db-debts.ts`, `db-expenses.ts`, `db-settings.ts`, `db-product-variants.ts` | Subscription enforcement incomplete — expired subscription not blocking mutations |
| 3 | Wire Primary Device check into `createSale`/`createSaleOffline` | `db-sales.ts` | Stock conflict risk when Primary Device unavailable |
| 4 | Verify and fix `cloudDownloadSnapshot()` | `cloud-snapshot.ts` | New device recovery may not work |

### Priority 2 — Event bus completeness

| # | Task | Files | Reason |
|---|------|-------|--------|
| 5 | Emit `PRODUCT_CREATED/UPDATED/DELETED` | `db-products.ts` | Audit + notifications require these |
| 6 | Emit `CUSTOMER_CREATED` | `db-customers.ts` | Audit + notifications require these |
| 7 | Emit `DEBT_CREATED`, `DEBT_PAYMENT_RECORDED` | `db-debts.ts` | Notifications already wired for these |
| 8 | Emit `EXPENSE_CREATED` | `db-expenses.ts` | Audit trail |
| 9 | Emit `STOCK_ADJUSTED` | `db-products.ts` | Audit + notifications |

### Priority 3 — Missing business capabilities

| # | Task | Reason |
|---|------|--------|
| 10 | Debt write-off (`writeOffDebt()`) | Full debt lifecycle |
| 11 | Invitation flow (generate + accept) | Team enrollment |
| 12 | Business shop switcher | Multi-business owners |
| 13 | Team section UI integration | Employee management |

### Priority 4 — Cleanup

| # | Task | Reason |
|---|------|--------|
| 14 | Remove `clients.tsx` legacy tab | Duplicate of customers |
| 15 | Consolidate `pos.tsx` into `sell.tsx` | Remove duplication; sell.tsx has full LAN UI |
| 16 | Start sync queue worker in app init | Auto-drain sync queue |
| 17 | Add `DEBT_PAYMENT_REMINDER` notification rule | Debt proactive reminders |
| 18 | Add stock transfer | Complete inventory operations |
| 19 | Add stock reservation | Complete inventory operations |

---

## 13. WHAT DOES NOT NEED TO CHANGE

The following are architecturally sound and should NOT be touched:

- ✅ `db-inventory-transactions.ts` — correct immutable ledger pattern
- ✅ `sdk-event-bus.ts` + `publishSdkEvent()` — correct event bus design
- ✅ `sdk-notifications.ts` — correct workaround, clearly documented as temporary
- ✅ `sdk-audit-recorder.ts` + `sdk-audit-storage.ts` — correct SDK audit wiring
- ✅ `mobile-primary-coordinator.ts` — correct heartbeat/threshold implementation
- ✅ `mobile-offline-state.ts` — correct 3-day grace implementation
- ✅ `mobile-sync-integration.ts` — correct LAN sync with Primary Device gating
- ✅ `entitlement-cache.ts` — correct 3-day offline cache
- ✅ `rbac.ts` — correct coarse→fine mapping
- ✅ All 9 adapter implementations — all wired and correct
- ✅ Dual auth (magic code + PIN) — both correctly implemented
- ✅ Conflict resolution infrastructure — partial fulfill/cancel/escalate all correct
- ✅ Settings (full config) — complete and correct

---

## 14. SUMMARY TABLE

| Area | Status | Count |
|------|--------|-------|
| Capabilities matching vision | ✅ COMPLETE | 16 |
| Capabilities narrower than vision | ⚠️ PARTIAL | 4 |
| Capabilities missing | 🔴 MISSING | 9 |
| Capabilities incorrectly scoped | 🟡 LEGACY | 3 |
| RBAC gaps | 🔴 HIGH | 2 |
| SDK gaps | 🟠 SDK BLOCKED | 2 |

**Total: 28 audited areas**

---

## 15. PROTECTED BASELINE

The following must NOT be reopened or broadly refactored:

- The 140/140 passing tests
- `rbac.ts` permission mapping logic
- The SDK adapter architecture
- `db-inventory-transactions.ts` ledger pattern
- The offline state machine
- The Primary Device coordinator
- The event bus design

The items in Priority 1 above are **additions and fixes** to existing services, not refactors of the working architecture.
