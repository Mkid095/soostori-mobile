# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
