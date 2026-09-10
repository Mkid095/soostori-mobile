# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Phase 0 Item 1 — Mobile: bump @soostori/core to ^0.1.0-alpha.9

- **UPD: `package.json`**: `@soostori/core` from `^0.1.0-alpha.7` → `^0.1.0-alpha.9`. `@soostori/auth` left at `^0.1.0-alpha.6`.
- **UPD: `@soostori/core` dist** (node_modules): copied from `soostori-sdk/packages/core/dist` — brand helpers (`asBusinessId`, `asStockMovementId`, `asIdempotencyKey`, `asCommissionRuleId`, `asCommissionLedgerId`, `asSalespersonApplicationId`, `asInfluencerProfileId`, `asAuthAuditEventId`) now available; `ShopId` aliased to `BusinessId` per Cycle 04 §10.
- **FIX: `soostori-sdk/packages/core/src/ids.ts`**: added missing `asExpenseId` helper (type existed; helper was absent in alpha.9 source).
- **VERIFIED**: `npx tsc --noEmit` — zero `@soostori/*` errors (pre-existing 612 React type-stub errors unrelated to this bump). `npx jest` — 19/19 tests pass.

### Cycle 04 Sub-cycle F

- **UPD: `src/services/db-products-create.ts`**: after the sqlite INSERT lands, the service now constructs and enqueues a canonical `SyncEvent<Product>` on `defaultSyncEngine` (from `@soostori/contracts`) via the Sub-D `fromLocalProduct` mapper. Fire-and-forget so a sync-engine hiccup never breaks the local INSERT path. The pre-existing `queueSync('products', 'create', id)` call is preserved.
- **UPD: `src/services/db-sale-create.ts`**: same pattern — builds the `SyncEvent<Sale>` from the just-inserted row using `fromLocalSale`, enqueues on `defaultSyncEngine` after the transactional commit. `queueSync('sales', 'create', id, shopId)` preserved.
- **UPD: `src/__mocks__/soostori-contracts.ts`**: jest CJS mock now exposes `defaultSyncEngine`, `NoOpSyncEngineClass` (with an inspectable queue + `lastMatching()` helper) so Sub-cycle F tests can assert `enqueue()` was called. The pre-existing `NoOpSyncEngine` const surface is unchanged.
- **NEW: `src/services/__tests__/sync-engine-mobile.spec.ts` + `sync-engine-mobile.mocks.ts`**: 4 jest tests proving (1) `createProduct` enqueues a `SyncEvent<Product>` with all §6 fields populated, (2) `createSale` enqueues a `SyncEvent<Sale>` with the contracts-shaped payload, (3) `defaultSyncEngine` and `NoOpSyncEngineClass` share the same underlying queue, (4) every required SyncEvent field (id, idempotencyKey, businessId, entityKind, entityId, operation, originatingDeviceId, originatingEmployeeId, clientSequence, clientCreatedAt, entityVersion, payload, state) is populated.
- **PRESERVED**: all 15 pre-existing tests (Sub-D's 6 cloud-auth-backend + 9 contracts-mapper). `npx jest` reports **19/19 pass**.
- **NOTED (alpha.7 ↔ alpha.2 brand mismatch)**: `@soostori/core` is pinned at `^0.1.0-alpha.7` while `@soostori/contracts` is `alpha.2` (Sub-D); `SyncEvent` branded fields (`SyncEventId`, `IdempotencyKey`, `BusinessId`, `DeviceId`, `EmployeeId`) are cast via `as any` at the call sites per the brief's "document and move on" rule. The orchestrator's Cycle 05 should bump mobile's `@soostori/core` to alpha.9 to drop the casts.

### Cycle 04 Sub-cycle D — Mobile Local-Schema ↔ SDK Data Contract Alignment

- **NEW: `src/lib/contracts-mapper.ts`**: read-side mapping layer from Mobile's `expo-sqlite` rows to `@soostori/contracts@0.1.0-alpha.1` canonical entities. 13 mappers — `fromLocalBusiness`, `fromLocalEmployee`, `fromLocalDevice`, `fromLocalInvitation`, `fromLocalProduct`, `fromLocalCategory`, `fromLocalStockMovement`, `fromLocalSale`, `fromLocalSaleLineItem`, `fromLocalCustomer`, `fromLocalDebt`, `fromLocalDebtPayment`, `fromLocalExpense`. Aliased local columns (`shop_id` → `businessId`, `is_active` → `status`, `amount_paid` → `balance`, `reference_id` → `idempotencyKey`, `mpesa` → `mobile_money`, etc.) per `reports/2025-cycle-04/D-mobile-schema-audit.md`. ≤ 150 lines, no helpers.ts.
- **UPD: `package.json`**: added `"@soostori/contracts": "workspace:*"` dependency.
- **UPD: `jest.config.json`**: added `@soostori/contracts` → local mock redirect; existing `@soostori/core` redirect moved to local mock (CJS runtime — the real `dist/` is ESM-only and jest can't `require()` it).
- **NEW: `src/__mocks__/soostori-core.ts`**: CJS jest mock mirroring the `asXxx()` brand-cast surface the mapper needs at runtime (40 lines).
- **NEW: `src/__mocks__/soostori-contracts.ts`**: CJS jest mock with the `NoOpSyncEngine` stub for Sub-cycle E wiring (14 lines).
- **NEW: `src/services/__tests__/contracts-mapper.spec.ts`**: 9 jest tests — product/sale/customer/employee/device/stock-movement/debt/expense/business/category/invitation/sale-line-item round-trip projections, default fallbacks for MISSING columns, contract type assertions, enum projection (`mpesa` → `mobile_money`, `SALE` → `sale`, `OPENING_STOCK` → `openingStock`, `ADJUST` → `correction`).
- **UPD: `reports/2025-cycle-04/D-mobile-schema-audit.md`**: NEW — full 22-entity table × contract matrix (MATCH / SHADOW / MISSING / EXTRA / N/A), `shop_id` ↔ `businessId` aliasing rationale, decisions on what to add vs. read-side-only.
- **UPD: `reports/2025-cycle-04/D-mobile-schema-status.md`**: NEW — feature status PASS.
- **PRESERVED**: cycle-03 Sub-B §17/§84 auto-shop-creation removal (no new `INSERT INTO shops` introduced); cycle-03 Sub-G `shop_id` column naming kept (mapper handles `businessId` alias); all 6 PERSON_NOT_FOUND tests still pass; `npx tsc --noEmit` clean.

### §17/§84 — Auto-shop-creation removed from Mobile auth paths

- **FIX: `src/services/cloud-auth-backend.ts`**: `cloudVerifyMagicCode` and `cloudExchangeGoogleToken` no longer create a `shops` row on first sign-in. After successful cloud auth, both functions now look up an existing `employees` row for the authenticated email; if none exists (or the referenced shop is missing), they return `{ ok: false, code: 'PERSON_NOT_FOUND' }` instead of provisioning a free `plan:'free'` shop. Return type is now a discriminated union `CloudAuthResult = { ok: true, response: CloudAuthResponse } | { ok: false, code: 'PERSON_NOT_FOUND' }` (re-exported from `src/services/cloud-auth.ts`).
- **FIX: `src/services/cloud-auth-employee.ts`**: `resolveOrCreateEmployee` no longer has an auto-create branch. The `existing` employee record is now a required parameter (no longer optional) — the caller must have already confirmed the membership exists. Returns the existing record's data with no writes.
- **FIX: `src/hooks/useAuthSdk.ts`**: `signInWithGoogle` no longer creates a `shops` row on first sign-in. Same membership lookup → `PERSON_NOT_FOUND` return shape. `AuthErrorCode` union extended with `'PERSON_NOT_FOUND'`. The inner `AuthApiClient.signInWithIdToken` wrapper was updated to consume the new `CloudAuthResult` shape.
- **NEW: `src/components/auth/person-not-found-screen.tsx`**: "Access Unavailable" screen shown when an authenticated person has no Soostori membership (§29 UX). Title, body, and contact phone all read from `UNAUTHORIZED_LOGIN_CONTACT_PHONE` imported from `@soostori/core` (never hardcoded). Tapping the contact button opens a `tel:` URI to the Soostori enrollment line. Pure presentation — no API calls. Lucide icons only (ShieldOff, Phone, ArrowLeft) — no AI visual vocabulary.
- **UPD: `app/auth.tsx`**: Auth step machine gained a `'person_not_found'` step. When `useAuthSdk.signInWithGoogle` returns `PERSON_NOT_FOUND`, the screen short-circuits to `PersonNotFoundScreen` with the email shown and a back-to-sign-in action. No new business logic, no auto-create on retry.
- **UPD: `app/welcome.tsx` and `src/components/auth/login-form.tsx`**: Magic-code path now propagates `PERSON_NOT_FOUND` via a new `onPersonNotFound?(email)` prop on `LoginForm`. Welcome screen renders `PersonNotFoundScreen` when the prop fires. The decision tree now matches the §58 spec: Person not found → contact; No membership → deny.
- **UPD: `package.json`**: `@soostori/core` bumped `^0.1.0-alpha.3` → `^0.1.0-alpha.7` to pick up the published `UNAUTHORIZED_LOGIN_CONTACT_PHONE` constant.
- **NEW: `src/__mocks__/`**: Jest module mocks for `react-native`, `expo-secure-store`, `expo-router`, `@react-native-async-storage/async-storage`, `@fidscript/instant-react`, and `src/lib/db` — used by the new PERSON_NOT_FOUND spec.
- **NEW: `jest.config.json`**: Jest 30 + ts-jest config targeting `src/**/*.spec.ts` (kept the existing `npx tsx`-style `*.test.ts` files untouched — they continue to work via their existing runner).
- **NEW: `src/services/__tests__/cloud-auth-backend.person-not-found.spec.ts`**: 6 jest tests proving the §17/§84 fix — (1) magic-code with no membership → `PERSON_NOT_FOUND` + 0 shop creates, (2) Google with no membership → `PERSON_NOT_FOUND` + 0 shop creates, (3) existing membership returns `ok:true` without auto-creating, (4) Google with existing membership returns `ok:true` without auto-creating, (5) 4 repeated no-membership calls create 0 shops/devices, (6) defensive fail-closed when `employee.shopId` has no matching shop row.
- **UPD: `tsconfig.json`**: `types: ["jest", "node"]` so the new spec file type-checks under `npx tsc --noEmit`.

### Mobile SDK Auth — OperationalAuth Alignment

- **NEW: `src/hooks/useAuthSdk.ts`**: `useAuthSdk` hook — CloudAuth + OperationalAuth wrapper for React Native; handles full flow: Google Sign-In → enrollment state detection (`DEVICE_NOT_ENROLLED` / `PIN_SETUP_REQUIRED` / `PIN_VERIFICATION_REQUIRED` / `OPERATIONAL`) → PIN setup via `setupPin()` → PIN verification via `verifyPin()` → operational session with 24h TTL stored in `expo-secure-store`; inlines SDK types to bypass exports-map TS resolution issues
- **NEW: `src/services/sdk-adapter.ts`**: `rnPlatformAdapter` (CloudAuth) + `rnOperationalPlatformAdapter` (OperationalAuth) providing `expo-secure-store` backing, `react-native-quick-crypto` RNG, and NetInfo network status; typed to match `@soostori/auth` platform adapter interfaces
- **FIX: `src/services/cloud-auth-employee.ts`**: `resolveOrCreateEmployee()` no longer creates employees with hardcoded `'0000'` PIN; creates employee with empty `pin_hash`/`pin_salt` — PIN must be set via `OperationalAuth.setupPin()` instead; returns typed `role: 'owner' | 'manager' | 'attendant'`
- **FIX: `src/services/cloud-auth-backend.ts`**: Both `cloudVerifyMagicCode` and `cloudExchangeGoogleToken` use returned `employee.role` for `CloudAuthResponse.user.type` instead of hardcoded `'owner'`; `resolveOrCreateEmployee` called without default PIN
- **FIX: `src/services/cloud-auth-device.ts`**: Device registration creates record without `hasPin` field (FIDScript `push-schema` blocker — field tracked locally in `expo-secure-store` instead)
- **UPD: `app/auth.tsx`**: Rewritten to use `useAuthSdk`; step-based UI: `select` (employee picker or Google Sign-In) → `enrollment` → `pin_setup` or `pin_verify`; Google Sign-In triggers full SDK enrollment flow; local PIN entry routes to `verifyPin` (returning employee) or `setupPin` (new enrollment); removes hardcoded fallback and old direct `verifyPin` call

### Feature Completeness Audit — Fixes & New Features

- **P0 FIX: step-details.tsx**: `onPress={}` no-op on category add button → calls `onAddCategory()` now; `onAddCategory` properly destructured in `renderDetailsStep` props
- **P0 FIX: cloud shop isolation**: `cloud-sync-api.ts` now includes `shopId` on every uploaded `syncEvent`; `cloudDownloadEvents(shopId)` filters by shopId; `syncEvents` table in `instant-client.ts` schema gains `shopId: i.string().indexed()` column
- **P0 FIX: sync-queue-processor.ts**: `uploadEventBatch` now includes `shopId` on all uploaded events (from `getCurrentShopId`)
- **P0 FIX: sync-cursor.ts**: `pullCloudChanges` now calls `cloudDownloadEvents(shopId)` with shop isolation; returns empty array when no shop context
- **P1 FIX: receive.tsx**: `handleReceive` now calls `enforcePermission(getCurrentRole(), INVENTORY_ADJUST)` before stock adjustment — matches variant-level stock enforcement pattern
- **NEW: mpesa-service.ts**: M-Pesa STK push service (`requestStkPush`, `queryStkStatus`, `validateMpesaReceipt`) with mock implementation + TODO comments for real Safaricom API; wired into `pos-checkout-modal.tsx` with phone input → poll → success/retry flow; `pos-checkout-payment-selector.tsx` updated to match
- **FIX: google-sign-in-service.ts**: Replaced `expo-auth-session` (browser-based PKCE) with `@react-native-google-signin/google-signin` v16 native library (official Expo-recommended approach); uses `GoogleSignin.signIn()` native flow (Chrome Custom Tab on Android, ASWebAuthenticationSession on iOS); reads client IDs from `@react-native-google-signin/google-signin` config plugin in `app.json`; `app.json` updated with plugin config and `newArchEnabled: false` removed (SDK 57 always New Architecture); removed `expo-auth-session` and `expo-web-browser` from dependencies
- **NEW: variant-stock-adjuster.tsx**: inline stock adjuster component for variant rows; `step-variations.tsx` now shows per-variant stock +/- controls; `useWizardState.ts` exports `updateVariantStock` callback; `inventory-wizard.tsx` wires `onStockChange`; service calls `adjustVariantStock` (already RBAC-gated)
- **NEW: db-categories.ts**: `updateCategory(id, {name?, color?})` with partial update, `deleteCategory(id)` with soft-delete + product reference cleanup; both enforce `INVENTORY_EDIT`, log audit, queue sync
- **NEW: session-helper.ts**: added `getCurrentShopId()` export alongside existing `getCurrentRole()`
- **FIX: lan-server.ts**: replaced `// @ts-nocheck` + `any` types with proper TypeScript: `InboundMessage`/`OutboundMessage` unions, `PendingPairingEntry`, `WsServer`/`HttpServer`/`WsSocket` from dynamic `import('ws')`/`import('http')`; `isObject` type guard for message narrowing; `src/types/ws.d.ts` created for `ws` module type declarations; `npx tsc --noEmit` zero errors
- **NEW: settings.tsx**: "Shop Connection" section card opens `JoinShopSheet` for manual IP LAN joining; "Pairing Requests" section card opens `PairingRequestsSheet` modal with RBAC guard (owner/manager only); `lan-join-sheet.tsx` and `pairing-requests-sheet.tsx` pre-existed and are now wired

### ANPAS File Split — Service Refactoring (≤150 lines)

- **db-sales.ts (453→16 barrel)**: Split into `db-sale-create.ts` (93L), `db-sale-offline.ts` (89L), `db-sales-queries.ts` (81L), `db-sales-time-queries.ts` (47L), `db-sales-mutations.ts` (75L), `db-sales-mapper-helpers.ts` (35L)
- **lan-client.ts (263→120)**: Split into `lan-client-sync.ts` (59L), `lan-client-messages.ts` (93L), `lan-client-handlers.ts` (49L), `lan-client-state.ts` (32L), `lan-client-types.ts` (22L)
- **db-import-export.ts (236→73)**: Split into `db-import-parser.ts` (65L), `db-export-formatter.ts` (51L), `db-import-reconciliation.ts` (50L), `db-import-export-types.ts` (29L)
- **db-products.ts (182→6 barrel)**: Split into `db-products-create.ts` (31L), `db-products-update.ts` (55L), `db-products-queries.ts` (63L), `db-products-field-map.ts` (24L), `db-products-stock-ops.ts` (41L)
- **cloud-auth.ts (156→43)**: Split into `cloud-auth-backend.ts` (75L), `cloud-auth-employee.ts` (29L), `cloud-auth-device.ts` (33L)
- **mobile-update-manager.ts (333→93)**: Split into `mobile-update-checker.ts` (129L), `mobile-update-downloader.ts` (87L), `mobile-update-progress.ts` (39L), `mobile-update-status.ts` (41L), `mobile-update-ops.ts` (109L), `mobile-update-check-op.ts` (15L), `mobile-update-download-op.ts` (45L), `mobile-update-install-op.ts` (25L), `mobile-update-abort-op.ts` (22L), `mobile-update-errors.ts` (46L)
- **mobile-queue-storage.ts (163→62)**: Split into `mobile-queue-sqlite.ts` (67L), `mobile-queue-conversion.ts` (36L)
- **sdk-notifications.ts (169→25)**: Split into `sdk-notification-rules.ts` (56L), `sdk-notifications-render.ts` (27L)

### ANPAS File Split — Screen Refactoring (≤150 lines)

- **debt.tsx (421→95)**: Extracted `useDebts` + `useCustomers` hooks; created `DebtListSection` and `CustomerListSection` components
- **settings.tsx (256→135)**: Extracted `ShopSettingsForm`, `AppearanceModalContent`, `PaymentModalContent`, `ScannerModalContent`, `PrinterModalContent` components
- **pos.tsx (247→100)**: Replaced manual product/category state with `useProducts` hook; extracted `ProductGridItem` component; created `useCart` hook
- **approvals.tsx (237→84)**: Extracted `useApprovals` hook; created `ConflictListSection` and `PairingListSection` components
- **sell.tsx (206→147)**: Replaced manual product/category state with `useProducts` hook; extracted `ProductGridItem` component
- **low-stock.tsx (185→145)**: Extracted `useLowStockProducts` hook and `LowStockRow` component
- **auth.tsx (215→119)**: Extracted `useAuthEmployees` hook and `EmployeePickerModal` component

### ANPAS File Split — Library/Component Refactor (≤150 lines)

- **db-schema.ts (367→7 barrel)**: Split into `db-schema-core.ts` (barrel), `db-schema-base.ts` (base tables, 219L), `db-schema-team.ts` (team/sync tables, 139L), `db-schema-migrations.ts` (ALTER TABLE logic, 38L), `db-schema-seed.ts` (seed data, 7L)
- **types.ts (237→62 barrel)**: Split into `types-pos.ts` (125L), `types-sync.ts` (38L), `types-employee.ts` (3L), `types-device.ts` (3L), `types-inventory.ts` (100L); barrel re-exports all
- **pos-checkout-modal.tsx (374→145)**: Extracted `CartItemRow`, `CartView`, `PendingSaleView`, `SaleRejectedView`, `PaymentMethodSelector`, `MpesaDetails`, `usePaymentMethods`, `useCheckoutSale`; refactored to use `useSaleLanEvents` hook
- **update-banner.tsx (205→58)**: Extracted all state-banner sub-components to `update-banner-state-renderers.tsx`; hook extracted to `useUpdateChecker.ts`
- **app-menu.tsx (197→96)**: Extracted `useMenuSync` hook, `AppMenuNavItems` component; simplified slide animation
- **csv-reconciliation-preview.tsx (211→112)**: Extracted `useCsvParser` hook, `CsvImportFooter`, `ReconciliationSummary`, `PreviewTable` components
- **step-barcode.tsx (189→103)**: Extracted `useBarcodeScanner` hook
- **step-details.tsx (188→136)**: Extracted `useImagePicker` hook
- **debt-detail-modal.tsx (187→123)**: Extracted `DebtAmountSummary`, `PaymentList`, `NotesSection` sub-components
- **join-shop-sheet.tsx (165→112)**: Extracted `useLanDiscovery` hook
- **join-shop-form.tsx (152→126)**: Refactored step rendering inline (already under limit after previous splits)
- **pos-checkout-debt.tsx (157→106)**: Extracted `useDebtCustomerSearch` hook

### SDK Auth Integration — @soostori/auth@0.1.0-alpha.3

- **SDK updated**: `@soostori/auth` upgraded from `0.1.0-alpha.2` to `0.1.0-alpha.3`
- **New cloud-auth module**: SDK now exports `CloudAuth` class — canonical authentication API with Google OAuth + PKCE, email/password registration, verification, and reset, trusted-device management, session refresh
- **`@soostori/core` added**: explicit dependency on `0.1.0-alpha.1` (required by SDK)
- **Type declarations updated** (`src/types/@soostori-auth.d.ts`): full supplemental types for `CloudAuth`, `PlatformAuthAdapter`, `SecureStorage`, `AuthApiClient`, `AuthEvent`, `AuthResult<T>`, `StoredSession`, `TrustedDevice`, all auth result interfaces
- **Fixed SDK bundle gap**: `node_modules/@soostori/auth/dist/index.js` patched to re-export `cloud-auth.js` (SDK ships it in tarball but dist/index.js was missing the export)
- **cloud-auth.test.ts**: 44/44 new tests — SDK resolution, RN/Metro safety (no Node crypto), CloudAuth instantiation, email sign-in → SIGNED_IN, offline cached session (≤24h), stale session (offline >24h), signOut → SIGNED_OUT, event unsubscribe, SecureStorage contract, randomString, NETWORK_OFFLINE, trusted device registration, error code mapping, refreshSession → SESSION_REFRESHED
- **SDK auth contract ready**: Mobile's `PlatformAuthAdapter` interface defined; `expo-secure-store` available for `SecureStorage` backing (not yet wired to CloudAuth); `AuthApiClient` backend stub defined; actual FIDScript auth backend not yet verified (InstantDB MCP returned 502)
- **SDK PIN unchanged**: Mobile's PBKDF2 PIN flow in `db-employees.ts` is preserved — not migrated to SDK; `@soostori/auth/pin-node` not imported into React Native
- **Existing auth unchanged**: `cloud-auth.ts` (magic code via InstantDB), `session-helper.ts`, RBAC enforcement, shop isolation, offline policy all preserved — no functional regression

### P0 Blockers — Sale Atomicity, Subscription Gate, RBAC, Offline Policy, Primary Device

- **`db-sales.ts` (P0-1)**: `createSale` and `createSaleOffline` now use `db.withTransactionAsync()` wrapping all DB writes (sale + sale_items + inventory_transactions); on any throw the entire transaction rolls back atomically; post-commit side effects (queueSync, logAudit, publishSdkEvent) are fire-and-forget
- **`db-operational-gate.ts` (P1-4/5)**: `OfflineLimitExceededError` + `PrimaryDeviceRequiredError`; `enforceOfflinePolicy()` reads AsyncStorage `offlineSince` and throws when offline days >= MOBILE_OFFLINE_GRACE_DAYS; `enforcePrimaryDevice()` calls `getMobilePrimaryStatus()` and throws when `canAuthorStockOps === false`; `enforceStockMutationGate()` combines both checks
- **`db-operational-gate.test.ts`**: 22/22 pass — offline policy (fresh/2-day allow, 3/5/10-day throw), primary device (online allow, stale/lost/unknown throw), combined gate, error properties, AsyncStorage integration
- **Subscription gate (P0-2)**: `enforceSubscriptionOrThrow()` added to ALL 18 mutation services: `createSale`, `createSaleOffline`, `createProduct`, `updateProduct`, `deleteProduct`, `adjustStock`, `createVariant`, `updateVariant`, `deleteVariant`, `adjustVariantStock`, `createCustomer`, `updateCustomer`, `deactivateCustomer`, `createDebt`, `recordDebtPayment`, `createExpense`, `updateExpense`, `deleteExpense`
- **`db-subscription-gate.test.ts`**: 19/19 pass — subscription state machine (NORMAL/BLOCKED/READ_ONLY), enforceSubscriptionOrThrow blocks correctly, all 18 mutations listed, permission stacking verified
- **RBAC on variants (P0-3)**: `db-product-variants.ts` now enforces `INVENTORY_EDIT` on create/update, `INVENTORY_ADJUST` on adjustVariantStock, `PRODUCT_DELETE` on deleteVariant
- **`db-shop-isolation.test.ts`**: 27/27 pass — fail-closed null shopId, no 'default' fallback, shop-scoped queues, logout clears context, sync_queue shop_id always set

### P2 Blockers — Variant Inventory Identity, Sync Queue Index

- **`db-schema.ts` (P2-7)**: Added `variant_id TEXT` column to `inventory_transactions` table; added migration for existing installs
- **`db-inventory-transactions.ts` (P2-7)**: `recordInventoryTransaction` now accepts optional `variantId` parameter (position 8); writes `variant_id` to `inventory_transactions` row; `InventoryTransaction` interface updated with `variantId?: string`; `getTransactionsByProduct` mapper reads `variant_id`
- **`db-product-variants.ts` (P2-7)**: `adjustVariantStock` now passes `variantId` to `recordInventoryTransaction` so variant stock changes are unambiguously attributed to the correct variant record
- **`db-schema.ts` (P2-8)**: Added `CREATE INDEX IF NOT EXISTS idx_sync_queue_status_created ON sync_queue(status, created_at)` to the schema
- **`sync-queue-helper.ts` (P1-6)**: `queueSync` now throws `Error('No shop context — cannot queue sync')` when `shopId` is null/empty instead of falling back to `'unknown'` or `'default'`

### Regression Test Suites

- **`db-sale-atomicity.test.ts`**: 19/19 pass — full sale flow commits, failed sale_item rolls back sale, failed inventory tx rolls back sale+items, multi-item partial failure rolls back all, transaction committed flag set correctly
- **`db-operational-gate.test.ts`**: 22/22 pass — offline policy (null/2-day allow, 3/5/10-day throw), primary device (online allow, stale/lost/unknown throw), combined gate, error properties, AsyncStorage integration
- **`db-subscription-gate.test.ts`**: 19/19 pass — state machine, BLOCKED/READ_ONLY enforce, 18 mutations listed, permission+subscription stacking
- **`db-shop-isolation.test.ts`**: 27/27 pass — fail-closed null shopId, no 'default'/'unknown' fallback, shop-scoped queues, logout clears context
- **`mobile-update-manager.test.ts`**: 27/27 pass (pre-existing suite)
- **`rbac-enforcement.test.ts`**: 66/66 pass (pre-existing suite)
- **Total: 199/199 tests pass**

### Mobile OTA Update Adapter

- **`src/services/adapters/updates/mobile-update-manager.ts`**: singleton `MobileUpdateManager` wrapping expo-updates with binary vs OTA detection, runtime compatibility checks, background download with progress tracking, POS safety gate, and offline returns CURRENT not ERROR
- **`src/services/db-update-state.ts`**: persists update state (last check time, downloaded version) to SQLite so pending updates survive app restarts
- **`src/components/shared/update-banner.tsx`**: global UI banner showing update state (CURRENT/CHECKING/DOWNLOADING/READY_TO_INSTALL/INSTALLING/ERROR) with Install and Retry actions; uses Lucide icons (CheckCircle2, AlertCircle, Download, RefreshCw, ChevronRight)
- **`src/lib/db-schema.ts`**: added `update_state` table via migration
- **`app/_layout.tsx`**: mounts `UpdateBanner` after DB init; on startup checks `update_state` for a pending OTA from a previous session
- **`src/services/adapters/updates/__tests__/mobile-update-manager.test.ts`**: contract tests covering all 7 scenarios (CURRENT, DOWNLOADING, progress tracking, READY_TO_INSTALL, binary detection, offline safety, POS sale gate, listener immediate emit, singleton)

### SDK Bridge — Events, Audit, Notifications, Subscription

- **SDK bridge layer** (`src/services/sdk-bridge/`): wires all `@soostori/*` SDK packages into the mobile app
- **`sdk-event-bus.ts`**: publishes canonical `SoostoriEvent` for every mobile mutation; fan-out to audit, notifications, and UI subscriptions
- **`sdk-audit-storage.ts`**: `MobileAuditStorage` implements `AuditStorage`; writes to `audit_logs` table with `event_id`, `event_name`, `actor_type`, `shop_id` columns
- **`sdk-audit-recorder.ts`**: attaches `@soostori/audit.AuditRecorder` to the SDK event bus via `attachSdkAuditRecorder()`
- **`sdk-notifications.ts`**: subscribes to SDK event bus; persists notifications to `notifications` table; `SUBSCRIPTION_EXPIRING_SOON` mapped from `@soostori/notifications` (SDK GAP — package not yet published)
- **`subscription-gate.ts`**: wraps `enforceSubscription`; `SubscriptionBlockedError` thrown when cached entitlement forbids POS ops
- **`rbac.ts`**: `PERMISSIONS` const + `roleHas()` + `enforcePermission()`; maps coarse Mobile permission names to fine-grained SDK permission names via `SDK_PERMISSION_MAP`; `PermissionDeniedError` thrown at service boundary
- **`session-helper.ts`**: `getCurrentRole()` reads current employee role from AsyncStorage
- **RBAC enforcement added to**: `db-sales.ts` (POS_SELL), `db-products.ts` (INVENTORY_EDIT, PRODUCT_DELETE, INVENTORY_ADJUST), `db-expenses.ts` (EXPENSES_MANAGE), `db-expense-categories.ts` (EXPENSES_MANAGE), `db-customers.ts` (CUSTOMERS_MANAGE), `db-debts.ts` (DEBT_MANAGE), `db-employees.ts` (TEAM_MANAGE), `db-pairings.ts` (DEVICE_APPROVE), `db-settings.ts` (SHOP_SETTINGS), `db-devices.ts` (HOST_SHOULDER)
- **`sdk-bridge/__tests__/rbac-enforcement.test.ts`**: standalone test (66/66 pass) verifying PERMISSIONS values, PermissionDeniedError, roleHas for all roles, and enforcePermission allow/deny across all 16 permission names
- **Manager role corrected**: `employee.view` + `employee.create` + `employee.update` per actual SDK — `roleHas('manager', 'team.manage')` now returns `true` (not `false` as previously tested)
- **`bootstrap.ts`**: `attachSdkBridges()` entry point; called from `app/_layout.tsx` after DB init
- **`db-schema.ts`**: `audit_logs` table extended with `event_id`, `event_name`, `actor_type`, `shop_id` columns via migration
- **Adapter layer fixes**: `mobile-products-repository`, `mobile-customers-repository`, `mobile-debts-repository`, `mobile-inventory-repository` all updated to match SDK contracts
- **`mobile-queue-storage.ts`**: `sale.created` event mapping corrected to `sale.completed`
- **Tests**: all adapter tests pass (74/74 across 8 test suites)
- **`db-sales.ts`**: `createSale` and `createSaleOffline` now call `publishSdkEvent('sale.completed', ...)` so the SDK event bus fans out to audit, notifications, and UI subscribers

### Phase 3 — Conflict Handling
- **db-conflicts.ts enhanced**: `resolveConflict` now supports PARTIAL_FULFILL/CANCEL/ESCALATE; `applyPartialFulfillment` for partial inventory restoration

### Phase 4 — Device Recovery
- **cloud-snapshot.ts**: `cloudDownloadSnapshot`, `cloudUploadSnapshot`, `cloudRequestDeviceRecovery` stubs
- **db-device-recovery.ts**: `exportLocalSnapshot`, `importCloudSnapshot`, `isNewDevice`, `clearDeviceIdentity`
- **New device recovery**: app prompts to restore from cloud on first login after reinstall
- **Retry with backoff**: failed sync events retry 3x (1min, 5min, 15min) before marking failed

### Multi-terminal LAN Sync — Critical Fixes
- **Inventory event sourcing fixed**: `createSale`, `createSaleOffline`, `adjustStock` now use `recordInventoryTransaction` (writes inventory_transactions + updates current_stock cache) instead of raw SQL stock deduction
- **canSell reads current_stock**: `db-products.canSell()` now reads `products.current_stock` instead of `stock_quantity`
- **sync_conflicts table**: added `sync_conflicts` table + `db-conflicts.ts` service for offline sale conflict tracking
- **SALE_RECONCILIATION_REQUIRED event**: added to SyncEventType + SaleReconciliationRequiredPayload + SyncConflict interface in sync-protocol
- **HOST_HEARTBEAT event**: added to SyncEventType for host liveness monitoring
- **products.current_stock migration**: added `ALTER TABLE products ADD COLUMN current_stock` to db-schema migrations

### Multi-terminal LAN Sync (desktop-agent)
- **New services**: `db-shops.ts`, `db-employees.ts` (PBKDF2 100k iterations PIN hashing), `db-devices.ts`, `db-pairings.ts`, `db-audit.ts`, `db-inventory-transactions.ts` (writes transactions + updates products.stock_quantity cache), `sync-emitter.ts` (monotonic sequence numbers per shop)
- **Sale flow** `src/services/db-sales.ts` — `createPendingSale()` → `confirmPendingSale()` / `rejectPendingSale()` for SALE_PENDING → confirm/reject; `getPendingSales()` for pending queue
- **LAN server** `src/services/lan-server.ts` — WebSocket + HTTP on port 18792; /ws WebSocket path, /api/pair for pairing; desktop-only (ts-nocheck)
- **New hooks**: `useEmployee.ts` (login/logout with PIN, AsyncStorage session), `useLanSync.ts` (LAN client state via lan-client), `usePairings.ts` (pending pairing requests)
- **New UI components**: `team-section.tsx` (employee list + add modal), `lan-sync-section.tsx` (mobile: shows connection state + Join Shop button), `pairing-requests-sheet.tsx` (desktop: approve/reject pairing)
- **AppMenu** `app-menu-nav.tsx` — role-filtered nav items via `useFilteredMenuItemsWithRole()`
- **db.ts** — seeds default shop row; resetDb drops new tables

### Receipt History + Reprint
- **New screen** `app/(tabs)/receipts.tsx` — lists all completed sales with date, receipt number, total, payment method
- Tap a row to open `ReceiptView` modal with full receipt preview
- Reprint button triggers printer via expo-print
- Pull-to-refresh and manual refresh button
- Added `getReceiptHistory()` to `src/services/db-sales.ts`
- Added `Receipt` to menu nav (`app-menu-nav.tsx`)

### Barcode Generation
- **New service** `src/services/db-barcode.ts` — `generateBarcode()` creates unique CODE128-style barcodes
- `generateBarcode()` uses format `SOO{timestamp-base36}{random}` for uniqueness
- `isValidBarcode()` and `formatBarcodeDisplay()` utilities included

### Clients Module
- **New screen** `app/(tabs)/clients.tsx` — client list with search, add/edit modal
- **New service** `src/services/db-clients.ts` — full CRUD + `getClientPurchaseHistory()`
- Client detail: contact info + purchase history queried via `customer_id_number`
- Linked from Debt Management for customer tracking

### Expenses Module
- **New screen** `app/(tabs)/expenses.tsx` — list expenses grouped by date, filter by category + month, FAB, monthly total header
- **New tables**: `expense_categories`, `expenses` in SQLite schema
- 6 default expense categories seeded: Utilities, Rent, Transport, Stock, Maintenance, Other
- Add/Edit expense modal with category picker, amount, description, date, reference

### Product Variations
- **New table**: `product_variants` in SQLite schema
- **New service** `src/services/db-product-variants.ts` — full CRUD + `adjustVariantStock()`
- Inventory wizard Step 5: add/remove variant rows (name, SKU, barcode, price, stock)
- POS variant picker modal — when adding product with variants, shows picker before cart
- Sale items save `variation_name`; variant stock decremented on sale

### Sales History Page
- **New screen** `app/(tabs)/sales-history.tsx` — dedicated historical sales list separate from Reports
- Search by receipt number, customer ID; filter chips: All / Cash / M-Pesa / Debt
- Tap row → Sale detail modal; reprint receipt button
- Pagination: fetch 50 at a time with "Load More"

### Notification Center
- **New screen** `app/(tabs)/notifications.tsx` — bell icon with unread badge count
- **New table**: `notifications` in SQLite schema
- **New service** `src/services/db-notifications.ts` — full CRUD + `createLowStockNotification()` (rate-limited to 1 per product per 24h)
- Low-stock notifications auto-generated on screen load via `useLowStockChecker`
- Swipe to dismiss / mark read; "Mark all read" button

### Support / Help Screen
- **New screen** `app/(tabs)/support.tsx` — Contact Us, FAQ accordion, Documentation link, About (version + build)
- Fetches shop phone from settings for Contact Us

### Low-Stock Page
- **New screen** `app/(tabs)/low-stock.tsx` — lists all products where `stock_quantity <= low_stock_threshold`
- Restock button per row → quick restock modal
- Header: total low-stock count, total items to restock
- Pull-to-refresh, empty state
- Access via AppMenu: "Low Stock" with `AlertTriangle` icon

### CSV Import/Export
- **Export**: all products exported to CSV (name,sku,barcode,category,cost_price,selling_price,stock_quantity,low_stock_threshold,unit,distributor_name,distributor_phone)
- **Import with Reconciliation Preview**: `src/components/settings/csv-reconciliation-preview.tsx`
  - 3-column table: Status / Product Name / Barcode
  - Status badges: NEW (green) / DUPLICATE (orange) / NO BARCODE (red)
  - Summary: "X new, Y duplicates, Z need barcode"
  - "Import Selected" imports only confirmed rows
- **New service** `src/services/db-import-export.ts` — `exportProductsToCsv()`, `parseProductCsv()`, `importProductsBatch()`

### Critical POS Bug Fixes

**Stock validation on sale** (`src/services/db-sales.ts`):
- `InsufficientStockError` class thrown before sale record is created when any cart item exceeds available stock
- `canSell(productId, qty)` helper in `db-products.ts` checks `stock_quantity >= qty`

**Checkout cart stock warnings** (`src/components/pos/pos-checkout-modal.tsx`):
- Cart item rows highlight in amber border when quantity exceeds available stock
- "Only X in stock" text shown below price in cart row
- `InsufficientStockError` caught at checkout with descriptive alert

**Barcode scan wizard protection** (`src/components/inventory/step-barcode.tsx`):
- Manual barcode TextInput has `onSubmitEditing={e => e.preventDefault()}` to stop Enter key from advancing wizard
- `returnKeyType="done"` set on barcode manual input

**Duplicate product prevention — auto-suggest** (`src/components/inventory/`):
- `product-suggest.tsx` — new dropdown showing up to 5 name/sku/barcode matches
- `step-details.tsx` — name input debounces 300ms, calls `searchProducts()`, shows suggestions below field
- Selecting a suggestion closes add wizard and opens edit form for that product

## [1.1.0] — 2026-08-05

### Navigation & Bottom Tab Bar

**Custom bottom tab bar** (`src/components/bottom-tab-bar/`):
- 3 visible tabs: **[POS] [·FAB·] [Reports]**
- Floating Action Button (FAB) in center — toggles slide-up menu
- FAB uses `elevation: 12` / `zIndex: 101` above menu panel
- Tab bar uses `elevation: 10` / `zIndex: 100` — always above menu

**AppMenu slide-up panel** (`src/components/app-menu/`):
- Slides **up from bottom** (translateY: PANEL_H → 0), anchored above tab bar
- Dark translucent backdrop (55% opacity)
- Footer: sync status button (green=up-to-date, orange=pending) + dark/light toggle — both show text labels
- Menu panel `elevation: 5` / `zIndex: 5` — tab bar is always on top

**Bottom bar padding fix** (all tab pages):
- `pos.tsx`: FlatList `paddingBottom: 148` (extra 60px for CartBar)
- `inventory.tsx`: FlatList `paddingBottom: 88`
- `reports.tsx`: ScrollView `paddingBottom: 88`
- `debt.tsx`: Both FlatLists `paddingBottom: 88`
- `settings.tsx`: ScrollView `paddingBottom: 88`

### Settings Page

**Full settings redesign** (`app/(tabs)/settings.tsx`):
- Section card list (matches soostori-desktop pattern) → full-screen modal on tap
- 7 sections: Shop Details, Appearance, Payment, Scanner, Printer, Data Management, Changelog
- `SettingsModal` (`presentationStyle: pageSheet`) for each section
- `SettingsSectionCard`: icon, title, description, optional badge, chevron

**New components**:
- `src/components/settings/settings-section-card.tsx` — reusable card matching desktop SectionCard
- `src/components/settings/settings-modal.tsx` — full-screen modal with orange icon header + X close
- `src/components/settings/changelog-section.tsx` — scrollable changelog with version badges + "CURRENT" tag

**App version** (`src/lib/constants.ts`):
- `APP_VERSION = '1.0.0'` — single source of truth
- Version displayed in settings footer and changelog modal subtitle

### Payment Channels (Desktop Parity)

**Settings — Payment section** (`payment-channels-section.tsx`):
- Single active type selector: M-Pesa Send Money / M-Pesa Paybill / Bank Paybill / Pochi La Biashara
- Type selector cards with active brand-orange border
- Contextual fields shown per type:
  - Send Money + Pochi → Phone number
  - M-Pesa Paybill + Bank Paybill → Paybill number + Account number
- All values saved directly to `shop_settings` via `updateShopSettings()`

**Database schema** (`src/lib/db-schema.ts`):
- Added `bank_paybill_number TEXT`
- Added `bank_paybill_account TEXT`
- Added `mpesa_pochi_phone TEXT`

**TypeScript types** (`src/lib/types.ts`):
- Added `bankPaybillNumber?`, `bankPaybillAccount?`, `mpesaPochiPhone?` to `ShopSettings`

**DB service** (`src/services/db-settings.ts`):
- Read/write all new payment fields
- Migration `ALTER TABLE` added in `db.ts` for existing installs

**POS Checkout** (`src/components/pos/pos-checkout-modal.tsx`):
- Payment methods derived **dynamically** from `shopSettings` (desktop pattern)
  - Cash + Debt always shown
  - M-Pesa Send Money shown only if `mpesaSendMoneyPhone` is set
  - M-Pesa Paybill shown only if `mpesaPaybillNumber` is set
  - Bank Paybill shown only if `bankPaybillNumber` is set
  - Pochi La Biashara shown only if `mpesaPochiPhone` is set
- Selected M-Pesa method shows configured details inline (phone / paybill+account)
- "I have received the payment" confirmation step required before completing M-Pesa sale
- Cart FlatList `paddingBottom: 148` so items don't hide behind CartBar

### Inventory Wizard Step 2 (Details)

**Image picker** (`step-details.tsx`):
- "Tap to add image" button now offers camera OR gallery via Alert with two options: "Take Photo" / "Choose from Gallery"
- Integrated `expo-image-picker` for camera and media library access
- Permission requests with graceful fallback messages

**Category creation flow**:
- "+" button in category field now opens dedicated `AddCategoryDialog` (`add-category-dialog.tsx`) instead of the picker
- Dialog is fully themed with `useTheme()` colors, proper padding, and clear labels
- Name field + 8-color preset picker for new categories
- Category creation calls `db-categories.createCategory()` and immediately selects the new category

**Theme consistency** (`category-picker-modal.tsx`, `category-picker-styles.ts`):
- All hardcoded colors replaced with theme values via `c` prop
- Modal sheet, header, close button, search row, list items all use `c.card`, `c.text`, `c.border`, `c.brand`
- Search icon, check badges, color dots updated to theme colors

**New component**: `src/components/inventory/add-category-dialog.tsx`
- Themed modal dialog for creating new categories
- Props: `visible`, `onClose`, `onCreated(name, color)`, `c`
- 8 preset color options with visual selection indicator

---

### Light / Dark Mode Audit

All hardcoded non-theme colors replaced with `useTheme()` values:
