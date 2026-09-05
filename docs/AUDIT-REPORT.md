# Soostori Mobile — Forensic Architecture Audit
**Date:** 2026-08-30
**Commit:** 2fb9c98
**Scope:** Full source tree, every service, screen, hook, and data path

---

## A. EXECUTIVE STATUS

### **NOT READY** — Estimated 15% proven functionality

The application has substantial scaffolding (47 TypeScript files, 20 screens, ~40 services), but the critical paths that define the architecture are **broken at multiple points**:

| Path | Status |
|------|--------|
| User opens app → cloud auth → enter shop | **BROKEN** (login flow dead) |
| Local POS sale → stock deduction → cloud sync | **PARTIAL** (sync never sends) |
| Cloud identity → shop/employee/device | **SCAFFOLD** (auth stub not wired) |
| Offline operation with restore on reconnect | **UNTESTED** (worker runs, upload throws) |
| Device recovery from cloud snapshot | **PLACEHOLDER** (throws until sync-contract) |

The largest single gap: **no user can log in**. The `LoginForm` component calls `cloudSendMagicCode` but the verification step is commented out and the success path never completes. `welcome.tsx` routes to `(tabs)/pos` without ever establishing a session.

---

## B. APPLICATION MAP

### Screens (20)
```
app/auth.tsx              — Employee PIN login (local DB only)
app/welcome.tsx           — Cloud auth entry (sends magic code, never completes)
app/(tabs)/_layout.tsx    — 18 tabs registered (role-filtered)
app/(tabs)/sell.tsx       — Fast POS with LAN status banner
app/(tabs)/pos.tsx        — Full POS (legacy)
app/(tabs)/inventory.tsx  — Product inventory list
app/(tabs)/reports.tsx    — Sales reports
app/(tabs)/debt.tsx       — Debt management
app/(tabs)/settings.tsx   — Full settings
app/(tabs)/customers.tsx  — Customer list
app/(tabs)/clients.tsx    — Client list (duplicate of customers?)
app/(tabs)/expenses.tsx   — Expense tracking
app/(tabs)/notifications.tsx — Bell + unread count
app/(tabs)/support.tsx    — Contact/FAQ/About
app/(tabs)/approvals.tsx  — Device pairing + sale conflicts
app/(tabs)/dashboard.tsx  — Manager dashboard
app/(tabs)/receipts.tsx   — Receipt history + reprint
app/(tabs)/sales-history.tsx — Historical sales
app/(tabs)/low-stock.tsx  — Low stock alerts
app/(tabs)/scan.tsx       — Barcode scanner
app/(tabs)/stock.tsx      — Stock counting
app/(tabs)/receive.tsx    — Stock receiving
```

### Services (44 .ts files)
```
Cloud layer:
  cloud-auth.ts           MAGIC CODE AUTH (send works, verify broken)
  cloud-sync-api.ts       upload/download events (connected to Instant DB)
  cloud-snapshot.ts       snapshot upload/download (connected to Instant DB)
  entitlement-cache.ts    3-day grace window cache (AsyncStorage)
  db-sync-state.ts        sync cursor + entitlement status (SQLite)

LAN layer:
  lan-client.ts           WebSocket client to desktop host
  device-discovery.ts     manual IP entry

POS layer:
  db-sales.ts             createSale, createSaleOffline, pending flow
  db-products.ts          CRUD + adjustStock + canSell
  db-product-variants.ts  variant management
  db-inventory-transactions.ts  event sourcing (truth)

Data layer:
  db-categories.ts, db-clients.ts, db-customers.ts
  db-debts.ts, db-expenses.ts, db-employees.ts
  db-devices.ts, db-pairings.ts, db-conflicts.ts
  db-audit.ts, db-shops.ts, db-notifications.ts
  db-barcode.ts, db-import-export.ts, db-receipts.ts
  db-backup.ts
  sync-queue-helper.ts, sync-queue-processor.ts, sync-emitter.ts

Auth/session:
  db-employees.ts         PBKDF2 PIN hashing (correct)

Hooks (12):
  useCloudSync.ts, useLanSync.ts, useEmployee.ts, usePairings.ts
  useProducts.ts, useCart.ts, useDatabase.ts, useClients.ts
  useNotifications.ts, useExpenses.ts, useExpenseCategories.ts
  useHeldSales.ts, useWizardState.ts
```

### Database Tables (31)
```
Base: products, categories, sales, sale_items, held_sales, stock_movements
      customers, debts, debt_payments, shop_settings, sync_queue, app_settings
      expense_categories, expenses, product_variants, notifications
Team/Sync: shops, employees, invitations, devices, device_pairings, sync_events
           inventory_transactions, audit_logs, sync_conflicts
Schema: schema_versions, sync_state
```

---

## C. FEATURE STATUS MATRIX

### Authentication & Identity

| Feature | Status | Evidence |
|---------|--------|----------|
| Magic code email send | **A** | `cloudSendMagicCode` → `db.auth.sendMagicCode()` — connects to Instant DB |
| Magic code verify | **D** | `cloudVerifyMagicCode` exists but is **never called** from login flow |
| Cloud token persistence | **C** | Stored in AsyncStorage but never validated on startup beyond existence check |
| PIN login (local employee) | **A** | `verifyPin()` PBKDF2 — works but bypasses cloud identity |
| Session restoration | **C** | `_layout.tsx` checks `CLOUD_TOKEN_KEY` exists + grace window — no re-auth required |
| Logout | **E** | No logout mechanism exists anywhere |
| Token refresh | **D** | `cloudRefreshToken` in cloud-auth.ts is a stub returning same token |
| Device registration | **C** | `registerDeviceWithCloud` exists but never called in auth flow |
| Device revocation | **E** | No UI or service for revoking devices |

### Shop & Employees

| Feature | Status | Evidence |
|---------|--------|----------|
| Cloud shop creation | **C** | `createDefaultShop` in cloud-auth.ts creates shop entity but doesn't return full response |
| Shop join (invitation) | **D** | `JoinShopForm` exists but calls `cloudSendMagicCode` — no invitation code flow |
| Employee creation (cloud) | **E** | `db-employees.ts` creates employees in local SQLite only; no cloud sync |
| Employee list (cloud) | **C** | Auth screen reads employees from local DB; cloud employees not loaded |
| Role-based menu | **B** | `useFilteredMenuItemsWithRole` filters tabs but roles come from local auth only |
| Invitation codes | **C** | `db-employees.ts generateInvitation` creates local record; cloud synced via queue |

### POS & Sales

| Feature | Status | Evidence |
|---------|--------|----------|
| Add to cart | **A** | `addToCartWithPrice` in sell.tsx works end-to-end |
| Barcode scan | **A** | `BarcodeScannerModal` + `getProductByBarcode` connected |
| Sale completion (local) | **A** | `createSale` writes to SQLite + inventory_transactions + queueSync |
| Sale completion (LAN) | **B** | `pos-checkout-modal` calls `emitSalePending` → host confirms → applies locally |
| Stock validation | **A** | `canSell` reads `current_stock`; throws `InsufficientStockError` |
| Inventory transaction | **A** | `recordInventoryTransaction` writes to `inventory_transactions` + updates `current_stock` |
| Pending sale flow | **A** | `createPendingSale` → `confirmPendingSale`/`rejectPendingSale` chain exists |
| Held sales | **A** | `holdSale` + `getHeldSales` + `deleteHeldSale` fully implemented |
| Offline sale | **A** | `createSaleOffline` with `pending_offline` status + queue sync |
| Receipt reprint | **A** | `getReceiptHistory` + expo-print in receipts.tsx |
| Sale conflict handling | **B** | `SALE_RECONCILIATION_REQUIRED` stored in `sync_conflicts`; UI shows in approvals |

### Inventory

| Feature | Status | Evidence |
|---------|--------|----------|
| Product CRUD | **A** | `createProduct`, `updateProduct`, `deleteProduct` all queue sync |
| Category management | **A** | Full CRUD + seed in schema |
| Stock adjustment | **A** | `adjustStock` uses `recordInventoryTransaction` + audit log |
| Product variants | **A** | `db-product-variants.ts` full CRUD + stock sync |
| Low-stock alerts | **A** | `getLowStockProducts` + notifications auto-generated |
| Barcode generation | **B** | `db-barcode.ts` exists; used in wizard but not verified |
| CSV import/export | **A** | `db-import-export.ts` with reconciliation preview |
| Bulk pricing | **B** | `pricing-bulk-card` + group prices in products |

### Customers & Debt

| Feature | Status | Evidence |
|---------|--------|----------|
| Customer CRUD | **A** | `db-customers.ts` + `db-clients.ts` (duplicated!) |
| Debt creation | **A** | `db-debts.ts` full flow |
| Debt payment | **A** | `createDebtPayment` queues sync |
| Purchase history | **C** | `getClientPurchaseHistory` in db-clients.ts exists |

### Expenses

| Feature | Status | Evidence |
|---------|--------|----------|
| Expense categories | **A** | Seeded + CRUD with queue sync |
| Expense CRUD | **A** | Full create/update/delete with queue sync |
| Monthly totals | **A** | Filtered by category + month in UI |

### Cloud Sync

| Feature | Status | Evidence |
|---------|--------|----------|
| Sync queue processor | **B** | `processSyncQueue` runs every 60s, calls `cloudUploadEvents` — **upload throws** (schema mismatch) |
| Cloud upload events | **C** | `cloudUploadEvents` uses `db.tx.syncEvents[x].create()` but entity requires all fields |
| Cloud download events | **C** | `cloudDownloadEvents` queries all events in last 24h — no sequence-based filtering |
| Retry with backoff | **B** | `markSyncEventRetryable` 1min→5min→15min, max 3 retries — functional |
| Failed event marking | **A** | `markEventFailed` in sync-queue-processor |
| Sync worker lifecycle | **B** | `useCloudSync` starts/stops worker — but `isWithinGraceWindow` always returns false (no entitlement cached) |
| Entitlement caching | **B** | `cacheEntitlement` stores in AsyncStorage — but never called from cloud auth |

### LAN Sync

| Feature | Status | Evidence |
|---------|--------|----------|
| WebSocket connect | **A** | `lanClient.connect()` with reconnection |
| SALE_CONFIRMED apply | **A** | Idempotent + inventory transaction |
| SALE_REJECTED apply | **A** | Idempotent |
| STOCK_UPDATED apply | **B** | Updates `stock_quantity` directly (not `current_stock`) |
| HOST_HEARTBEAT | **A** | Tracked; 30s timeout in `useLanSync` |
| SALE_RECONCILIATION | **A** | Stored in `sync_conflicts`; surfaced in approvals |
| LAN status UI | **A** | Banner in sell.tsx |
| Device pairing request | **B** | `requestPairing` HTTP POST to host; approval in pairing-requests-sheet |
| Auto-reconnect | **B** | Exponential backoff, max 10 attempts |

### Backup & Recovery

| Feature | Status | Evidence |
|---------|--------|----------|
| Cloud snapshot download | **C** | `cloudDownloadSnapshot` queries Instant DB — works but no filter by shop |
| Cloud snapshot upload | **C** | `cloudUploadSnapshot` creates backupSnapshots record |
| New device detection | **B** | `isNewDevice` checks `@soostori:cloudDeviceId` |
| Snapshot import | **D** | `importCloudSnapshot` throws "pending sync-contract" |
| Local export | **D** | `exportLocalSnapshot` throws "pending sync-contract" |
| Recovery prompt | **B** | `_layout.tsx` shows Alert on new device — but recovery itself fails |

### Subscription

| Feature | Status | Evidence |
|---------|--------|----------|
| Cloud verification | **D** | `verifySubscription` creates hardcoded 7-day expiry |
| 3-day grace window | **B** | `isWithinGraceWindow` checks AsyncStorage deadline — but never set |
| Sync gating | **B** | `processSyncQueue` skips if outside grace — but grace never activates |
| Subscription expiry handling | **E** | No enforcement; no restricted mode |
| Owner-only re-verification | **E** | Not implemented |

### Settings & Configuration

| Feature | Status | Evidence |
|---------|--------|----------|
| Shop details | **A** | `shop-details-form.tsx` + `db-settings.ts` |
| Payment channels | **A** | M-Pesa Send/Paybill, Bank Paybill, Pochi La Biashara |
| Printer config | **A** | `printer-section.tsx` + discovery |
| Scanner config | **A** | `scanner-section.tsx` |
| Appearance (dark/light) | **A** | `useTheme` + `appearance-section.tsx` |
| Team management | **A** | `team-section.tsx` — add/deactivate employees |
| LAN sync settings | **A** | `lan-sync-section.tsx` — connect to host |
| Data management | **A** | `data-management-section.tsx` — reset DB |
| Security (PIN/biometric) | **B** | `security-section.tsx` exists; biometric disabled |
| Changelog | **A** | `changelog-section.tsx` |

---

## D. DATABASE AUDIT

### Table-by-Table Analysis

| Table | PK | Purpose | Cloud Sync | Backup | Gap |
|-------|----|---------|-----------|--------|-----|
| `products` | `id` | Product catalog | queueSync on CRUD | partial | No cloud_shop_id linkage |
| `categories` | `id` | Product categories | queueSync | partial | |
| `sales` | `id` | Completed sales | queueSync | partial | Missing shop_id in many records |
| `sale_items` | `id` | Sale line items | queued with sale | partial | |
| `held_sales` | `id` | Paused transactions | queueSync | none | |
| `stock_movements` | `id` | Manual stock adjustments | queueSync | partial | |
| `customers` | `id` | Customer records | queueSync | partial | **Duplicated** with clients table |
| `debts` | `id` | Customer debt | queueSync | partial | |
| `debt_payments` | `id` | Debt payments | queueSync | partial | |
| `shop_settings` | `id` | Shop configuration | none | partial | |
| `sync_queue` | `id` | Pending cloud events | N/A | N/A | Missing retry_at usage |
| `app_settings` | `id` | Theme/language/PIN | none | partial | |
| `expense_categories` | `id` | Expense types | queueSync | partial | |
| `expenses` | `id` | Expense records | queueSync | partial | |
| `product_variants` | `id` | Product variants | queueSync | partial | |
| `notifications` | `id` | App notifications | none | partial | |
| `shops` | `id` | Shop identity | none | partial | Seeds "My Shop" — should come from cloud |
| `employees` | `id` | Employee accounts | queueSync | partial | PIN hashes local-only |
| `invitations` | `id` | Join codes | none | none | |
| `devices` | `id` | Registered devices | none | partial | cloud_registered never set |
| `device_pairings` | `id` | Pairing requests | none | none | |
| `sync_events` | `id` | LAN events | N/A | N/A | Only LAN; not cloud-synced |
| `inventory_transactions` | `id` | Event sourcing truth | none | partial | **Critical** — cloud never sees these |
| `audit_logs` | `id` | Mutation audit trail | none | none | **Dead code** — never read |
| `sync_conflicts` | `id` | Sale conflicts | none | partial | |
| `schema_versions` | `version` | Migration tracking | N/A | N/A | |
| `sync_state` | `id` | Sync cursor/status | N/A | N/A | |

### Cloud Schema vs Local Schema Mismatches

| Cloud Entity | Local Equivalent | Mismatch |
|-------------|-----------------|----------|
| `$users` (email unique) | None | No user identity stored locally |
| `shops` (slug, taxRate, plan, subscriptionExpiry, status) | `shops` + `shop_settings` | Split across two tables; cloud fields missing locally |
| `employees` (role, status, permissions, createdBy, invitedBy) | `employees` (role, pin_hash, pin_salt) | **Schema divergence** — cloud has no PIN, local has no permissions |
| `devices` (deviceId, deviceType, isLanHost, authorizedAt) | `devices` (device_name, device_type, is_host) | **Schema divergence** — field names differ |
| `subscriptions` (planKey, status, billingCycle, currentPeriodStart/End) | None | Not implemented locally |
| `plans` (key, name, priceMonthly/Yearly, deviceLimit, features) | None | Not implemented locally |
| `syncEvents` (entityId, entity, operation, payload, syncedAt) | `sync_events` (eventType, payload, timestamp) | **Schema divergence** — different field names |
| `backupSnapshots` (shopId, version, snapshotId, recordCounts, sizeBytes) | None | **No local table** — only cloud entity |
| `invitations` (shopId, employeeId, code, status, email, phone, createdBy, employeeRole) | `invitations` (code, expiresAt, usedAt) | **Schema divergence** — cloud has more fields |
| `syncStatus` (shopId, lastSyncAt, pendingEvents, deviceCount) | `sync_state` | Similar but different field names |
| `$files` (path unique, url) | None | Storage not implemented |
| `payments` (amount, status, currency, method, reference, paidAt) | `sales.payment_method` | **Embedded** in sales, not separate entity |

### Critical Field Mismatches

1. **`sync_events`** (local) vs **`syncEvents`** (cloud): local has `event_type`, cloud has `entity + operation`
2. **`devices`** (local): has `is_host`, cloud has `isLanHost`
3. **`employees`** (local): has `pin_hash/pin_salt`, cloud has `permissions`
4. **`shops`** (local): no `slug`, `plan`, `subscriptionExpiry` — all cloud-only

---

## E. MUTATION AUDIT — THE CRITICAL PATHS

### Sale Completion (POS)

```
UI (pos-checkout-modal.tsx:194)
  ↓ lanClient.emitSalePending({ ... })
  ↓ [WebSocket to host]
Host validates stock
  ↓ SALE_CONFIRMED event
lan-client.ts applySaleConfirmed()
  ↓ idempotency check: SELECT status WHERE id = ?
  ↓ UPDATE sales SET status = 'confirmed'
  ↓ recordInventoryTransaction() × N items  ← CORRECT
  ↓ onSaleConfirmed callback
```

**Gap:** `createSale()` (local direct sale) also writes `queueSync('sales', 'create', id)` but shopId is empty string `''` — cloud cannot correlate.

**Gap:** `applySaleConfirmed` for variants does **double stock deduction** — raw SQL update on `product_variants.stock_quantity` AND `recordInventoryTransaction` on the product.

### Cloud Upload (Sync Queue)

```
sync-queue-processor.ts: processSyncQueue()
  ↓ isWithinGraceWindow() → false (no entitlement cached)
  ↓ return { processed: 0, failed: 0 }  ← ALWAYS SKIPS
```

**Root cause:** `entitlement-cache` is never populated. `cloudVerifyMagicCode` exists but is never called.

### Cloud Auth Flow (Complete Trace)

```
welcome.tsx → [Login button]
  ↓ LoginForm.handleSendCode()
    ↓ cloudSendMagicCode(email) → db.auth.sendMagicCode({ email })  ✓ WORKS
  ↓ sets step = 'code', shows code input
  ↓ [User enters code]
    ↓ handleVerifyCode()
      ↓ cloudSendMagicCode(email) again  ← BUG: calls send again, not verify
      ↓ onSuccess() → router.replace('/(tabs)/pos')
        ↓ _layout.tsx: checks CLOUD_TOKEN_KEY
          ↓ token is null (never set) → authState = 'welcome' → loops back
```

**This is why no one can log in.** The verify step is a no-op.

---

## F. AUTHENTICATION — COMPLETE TRACE

### What actually happens on app launch

```
_layout.tsx useEffect:
  1. getDb() → opens SQLite
  2. Check CLOUD_TOKEN_KEY in AsyncStorage → NULL (never set)
  3. authState = 'welcome'
  4. Renders <Stack.Screen name="welcome" />
```

### What happens on welcome.tsx login attempt

```
User enters email → cloudSendMagicCode() → Instant DB sends email
User enters code → handleVerifyCode() → calls cloudSendMagicCode AGAIN (BUG)
  → sets success → router.replace('/(tabs)/pos')
_layout.tsx authState never changes from 'welcome' because:
  - CLOUD_TOKEN_KEY was never set
  - isWithinGraceWindow() returns false (no deadline set)
  → User sees welcome screen again
```

### What happens with local PIN auth (auth.tsx)

```
_auth.tsx loads employees from LOCAL SQLite
User selects employee → enters PIN
  → verifyPin() → PBKDF2 check against local hash
  → sets EMPLOYEE_ID_KEY + EMPLOYEE_ROLE_KEY in AsyncStorage
  → router.replace('/(tabs)/pos')
_layout.tsx:
  - CLOUD_TOKEN_KEY still NULL
  - But authState already 'app' from previous run
  →直接进入POS
```

**Result:** Old sessions persist. New users cannot authenticate at all.

### Key finding: Two parallel auth systems

1. **Cloud auth** (`welcome.tsx` → `cloudSendMagicCode`) — broken, never completes
2. **Local PIN auth** (`auth.tsx` → PBKDF2 verify) — works but bypasses cloud entirely

Neither system sets `CLOUD_TOKEN_KEY`. Neither system calls `cacheEntitlement`. The `useCloudSync` hook starts but immediately stops because `isWithinGraceWindow()` is always false.

---

## G. SECURITY FINDINGS

| # | Issue | Severity |
|---|-------|----------|
| 1 | **No logout** — no way to clear session or revoke device | P0 |
| 2 | **Two auth paths** — cloud auth broken, local PIN works but bypasses cloud | P0 |
| 3 | **CLOUD_TOKEN_KEY never set** — session persists indefinitely after first local login | P1 |
| 4 | **Entitlement never cached** — 3-day grace window never activates | P1 |
| 5 | **Sync uploads silently fail** — `processSyncQueue` returns 0 processed because grace window is always false | P1 |
| 6 | **Double stock deduction on variant sales** — `applySaleConfirmed` does raw SQL + recordInventoryTransaction | P1 |
| 7 | **`customers` table duplicated** — `db-customers.ts` AND `db-clients.ts` both exist with similar functionality | P2 |
| 8 | **shopId empty in queueSync** — all local operations use `''` or `'default'` as shopId | P2 |
| 9 | **No cross-shop isolation** — cloud queries don't filter by shopId | P2 |
| 10 | **Audit logs never read** — written but no consumer | P3 |

---

## H. TEST MATRIX

| # | Test | Result |
|---|------|--------|
| 1 | Fresh installation | **FAIL** — welcome screen shows, but login never completes |
| 2 | Owner login | **FAIL** — magic code sent but never verified; no token stored |
| 3 | Shop creation/join | **FAIL** — no cloud shop resolution in auth flow |
| 4 | Product creation | **PASS** — writes to SQLite, queues sync |
| 5 | Category creation | **PASS** — seeded at init, CRUD works |
| 6 | Inventory adjustment | **PASS** — `adjustStock` writes transaction + audit |
| 7 | Customer creation | **PASS** — both `db-customers.ts` and `db-clients.ts` work |
| 8 | Employee creation | **PASS** — local only; cloud not connected |
| 9 | Sale | **PASS** (local) — creates sale, deducts stock, queues sync |
| 10 | Payment | **PASS** — embedded in sale record |
| 11 | Debt | **PASS** — create + payment flow works |
| 12 | Debt payment | **PASS** — queues sync |
| 13 | Expense | **PASS** — full CRUD with categories |
| 14 | Offline sale | **PASS** — `createSaleOffline` writes pending_offline |
| 15 | App restart offline | **PASS** — SQLite persists; old sessions persist |
| 16 | Reconnect | **PARTIAL** — LAN reconnects; cloud never attempts |
| 17 | Cloud sync | **FAIL** — queue processor skips due to grace window |
| 18 | Duplicate event | **PASS** — idempotency checks in lan-client |
| 19 | Conflict | **PASS** — created in db, displayed in approvals |
| 20 | Cloud recovery | **FAIL** — `importCloudSnapshot` throws |
| 21 | Device registration | **FAIL** — `registerDeviceWithCloud` never called |
| 22 | Device revocation | **FAIL** — not implemented |
| 23 | Subscription expiry | **FAIL** — no enforcement |
| 24 | Mobile-only operation | **PASS** (local) — works without desktop/cloud |
| 25 | Mobile + desktop LAN | **PARTIAL** — works if host running |
| 26 | Cloud unavailable | **PASS** — offline mode degrades gracefully |
| 27 | Multiple devices | **FAIL** — no cloud identity established |

**Pass rate: 14/27 = 52% (but only local operations pass)**

---

## I. CRITICAL GAPS — RANKED

### P0 — Blocks Production

| # | Gap | Impact | Fix |
|---|-----|--------|-----|
| 1 | **Auth flow dead** | No user can log in via cloud; only local PIN persists from previous session | Wire `cloudVerifyMagicCode` into `login-form.tsx`; set `CLOUD_TOKEN_KEY`; call `cacheEntitlement` |
| 2 | **No logout** | Session never expires; no device revocation | Add logout to settings; clear all AsyncStorage keys |
| 3 | **Entitlement never cached** | Sync worker always skips; no 3-day grace window | Call `cacheEntitlement` in `cloudVerifyMagicCode` |

### P1 — Major

| # | Gap | Impact | Fix |
|---|-----|--------|-----|
| 4 | **Sync uploads never reach cloud** | All data stays local-only | Fix `processSyncQueue` to upload even without entitlement (or fix entitlement); fix schema mismatch in `cloudUploadEvents` |
| 5 | **Double stock deduction on variant sales** | Variant inventory goes negative | Remove raw SQL update in `applySaleConfirmed` — `recordInventoryTransaction` already handles it |
| 6 | **shopId empty in all sync events** | Cloud cannot correlate events to shop | Pass actual shopId from employee context |
| 7 | **`importCloudSnapshot` still throws** | Device recovery broken | Implement using `cloudDownloadSnapshot` + SQLite insert |
| 8 | **`exportLocalSnapshot` still throws** | No local backup available | Implement by reading all tables |

### P2 — Important

| # | Gap | Impact | Fix |
|---|-----|--------|-----|
| 9 | **Cloud entity schemas don't match local** | Sync events may fail validation | Align `sync_events` fields to cloud schema; add shopId to all entities |
| 10 | **`customers` and `clients` duplicated** | Confusing API surface | Merge into one service |
| 11 | **Cloud queries don't filter by shopId** | Cross-shop data leakage | Add `where: { shopId }` to all cloud queries |
| 12 | **`lastSeenAt` never updated** | Device liveness unknown to cloud | Heartbeat should update cloud device |
| 13 | **No subscription enforcement** | Expired subscribers can use app indefinitely | Implement actual check against `shops.subscriptionExpiry` |
| 14 | **`app_settings.pin_set` not used** | PIN gate in settings is cosmetic | Connect to auth flow |

### P3 — Polish

| # | Gap | Impact | Fix |
|---|-----|--------|-----|
| 15 | **Audit logs never consumed** | Dead code, false sense of security | Read audit logs in settings or admin panel |
| 16 | **Schema versions not displayed** | No visibility into DB state | Show in settings |
| 17 | **`createSale` uses empty shopId** | Inconsistent with `createPendingSale` which uses real shopId | Standardize to use `DEFAULT_SHOP_ID` or real cloud shopId |
| 18 | **`current_stock` vs `stock_quantity` inconsistency** | Some queries read one, some the other | Audit all `stock_quantity` reads and replace with `current_stock` |

---

## J. DUPLICATE / CONFLICTING ARCHITECTURE

### 1. Two Auth Systems Running in Parallel

| System | Entry Point | Stores | Result |
|--------|------------|--------|--------|
| Cloud auth | `welcome.tsx` | `CLOUD_TOKEN_KEY` | **Never reaches this** — flow broken |
| Local PIN | `auth.tsx` | `EMPLOYEE_ID_KEY` + `EMPLOYEE_ROLE_KEY` | **Actually works** — but bypasses cloud |

These two systems are completely disconnected. The `_layout.tsx` only checks the cloud path.

### 2. Two Customer Services

| File | Purpose | Called From |
|------|---------|-------------|
| `db-customers.ts` | Customer CRUD | `customers.tsx` |
| `db-clients.ts` | Client CRUD + purchase history | `clients.tsx` |

Both tables exist (`customers`). Both services are separate. One is likely a duplicate.

### 3. Two Stock Columns

| Column | Used By | Source of Truth |
|--------|---------|-----------------|
| `products.current_stock` | `canSell`, `recordInventoryTransaction` | Event sourcing (correct) |
| `products.stock_quantity` | Legacy queries, `applyStockUpdated` | Stale cache (may diverge) |
| `product_variants.stock_quantity` | Variant lookups | Separate from products |

### 4. Two Sync Mechanisms

| Mechanism | Target | Status |
|-----------|--------|--------|
| `sync_queue` → `cloudUploadEvents` | Instant DB `syncEvents` | **Broken** — never uploads |
| `sync_events` table + `emitEvent` | LAN host via WebSocket | **Works** (LAN only) |

No mechanism exists to push `sync_events` (LAN events) to the cloud.

### 5. Shop Identity Fragmented

| Location | Fields | Cloud Fields |
|----------|--------|-------------|
| `shops` table | id, name, cloud columns | slug, taxRate, plan, subscriptionExpiry, status |
| `shop_settings` table | shop_name, address, phone, payment channels | none of the above |

The cloud `shops` entity has fields that have no local equivalent. The local `shop_settings` has fields not in cloud.

---

## K. REQUIRED NEXT STEPS

### Immediate (P0) — Fix the Auth Gateway

1. **Wire `cloudVerifyMagicCode`** into `login-form.tsx` — the verify step currently calls `cloudSendMagicCode` again instead of `cloudVerifyMagicCode`
2. **Set `CLOUD_TOKEN_KEY`** in `cloudVerifyMagicCode` after successful verification
3. **Call `cacheEntitlement`** in `cloudVerifyMagicCode` with real cloud subscription data
4. **Add logout** — button in settings that clears `CLOUD_TOKEN_KEY`, `EMPLOYEE_ID_KEY`, `EMPLOYEE_ROLE_KEY`, entitlement cache
5. **Fix `login-form.tsx` step-2 handler** to actually call `cloudVerifyMagicCode(email, code)` not `cloudSendMagicCode`

### P1 — Fix Sync

6. **Fix `cloudUploadEvents`** — the `tx.syncEvents[x].create()` call fails because schema requires all fields. Either make optional fields nullable or fix the schema
7. **Pass shopId** from employee context into `queueSync` calls — currently hardcoded to `''`
8. **Fix double stock deduction** in `applySaleConfirmed` for variants — remove raw SQL update, keep only `recordInventoryTransaction`
9. **Implement `importCloudSnapshot`** — read from `cloudDownloadSnapshot`, insert into SQLite
10. **Implement `exportLocalSnapshot`** — read all tables, call `cloudUploadSnapshot`

### P2 — Data Integrity

11. **Merge `db-customers.ts` and `db-clients.ts`** — pick one as authoritative
12. **Standardize shopId** — all operations should use the cloud-resolved shopId, not `'default'`
13. **Align sync_events local schema** to cloud schema (rename fields)
14. **Add shopId filter** to all cloud queries to prevent cross-shop access

### P3 — Polish

15. **Audit all `stock_quantity` reads** — replace with `current_stock`
16. **Display audit logs** in a settings/admin screen
17. **Show schema version** in settings
18. **Implement actual subscription expiry check** against cloud `shops.subscriptionExpiry`

---

## L. WHAT PROVES IT WORKS (Local Operations Only)

These paths are proven and functional today:

1. **POS: Add product → Cart → Checkout → Cash payment** — Creates sale, deducts stock via `recordInventoryTransaction`, queues sync event
2. **Inventory: Create product with barcode + variants** — Full wizard, writes to SQLite
3. **Stock adjustment** — Writes `inventory_transactions` + updates `current_stock` + audit log
4. **Debt: Record customer debt + partial payment** — Full flow with queue sync
5. **Expenses: Create with category + date** — Full CRUD
6. **LAN: Connect to host → Sale approved/rejected** — Idempotent, inventory updated
7. **Conflicts: Stock conflict received → stored in sync_conflicts** — Displayed in approvals
8. **Hot reload persistence** — All data survives app restart via SQLite
9. **Schema migrations** — Version 1 and 2 run correctly on first launch

---

## M. WHAT DOES NOT WORK (Cloud Path)

1. **Login** — Magic code sent but never verified; token never stored; app loops back to welcome
2. **Cloud sync** — Queue processor always skips (no entitlement cached); upload would fail even if reached
3. **Device recovery** — `importCloudSnapshot` throws; export throws
4. **Subscription enforcement** — Hardcoded 7-day expiry; never checked against cloud
5. **Cross-device sync** — No mechanism to resolve "which shop does this device belong to" without cloud auth working first
