# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Teammate Merge — All Pages Updated

**POS (teammate merged)**:
- `app/(tabs)/pos.tsx` — Full checkout flow with Cash/M-Pesa/Debt payment panels, barcode scanner integration, receipt generation via `db-receipts`
- `src/components/pos/pos-checkout-*.tsx` — Separate payment flow components
- `src/components/pos/receipt-view.tsx` — Receipt preview with print/share

**Inventory (teammate merged)**:
- `src/components/inventory/inventory-wizard.tsx` — 5-step wizard (Type/Details/Pricing/Distributor/Barcode)
- `src/components/inventory/step-*.tsx` — Individual step components
- `src/components/inventory/restock-panel.tsx` — Inline restock panel
- `src/components/inventory/inventory-edit-form.tsx` — Edit wrapper around wizard
- `src/components/inventory/inventory-add-form.tsx` — Add product form

**Reports (teammate merged)**:
- `app/(tabs)/reports.tsx` — KPI cards, payment method breakdown chart, date filters (Today/Week/All)
- `src/components/reports/stat-card.tsx`, `stats-section.tsx` — Stat display components
- `src/components/reports/sale-detail-modal.tsx` — Sale detail with print/share
- `src/components/reports/export-modal.tsx` — CSV/HTML report export
- `src/lib/report-export.ts` — Report generation helpers

**Debt (teammate merged)**:
- `src/components/shared/add-customer-modal.tsx` — Customer creation modal
- `src/services/db-customers.ts` — Full customer CRUD (new file)

**Shared services added**:
- `src/services/db-customers.ts` — Customer CRUD with search
- Added `getWeekSales`, `getMonthSales` to `db-sales.ts`
- Added `getTotalDebtCollected`, `getDebtCollectedByDateRange` to `db-debts.ts`

### Navigation & Menu Fixes
- **AppMenu** (`src/components/shared/app-menu.tsx`) — Now reads `menuOpen`/`closeMenu` directly from `MenuContext` instead of relying on parent props; menu closes on navigation
- **Tab layout** (`app/(tabs)/_layout.tsx`) — Rewritten with 3 visible tabs (POS/Reports/Stock) + floating orange center menu button that calls `openMenu()`; hides native expo-router tab bar
- **AppHeader** — Top bar with sync badge, dark/light toggle, settings gear on all pages

### Bug Fixes
- `step-type.tsx` — Fixed undefined `c` references in `TypeCard` (replaced with explicit props)
- `inventory-wizard.tsx` — Fixed `setErrors` type error with `as any` cast
- `restock-panel.tsx` — Fixed `product` possibly null with non-null assertion
- `inventory-edit-form.tsx` — Removed invalid `editProductId` prop passed to `InventoryWizard`
- `sale-detail-modal.tsx` — Fixed `generateReceiptHTML` call to use `buildReceiptData` first (converts `Sale` → `ReceiptData`)
- `db-receipts.ts` — Already had `generateReceiptHTML`; `report-export.ts` has `generateSalesHTML` for reports
- All missing service functions added to `db-sales.ts` and `db-debts.ts`


### Auth & Onboarding
- **PIN login** (`app/auth.tsx`): Full-screen 4-digit PIN pad. Default PIN "0000". Shake animation + error on wrong PIN. Fingerprint icon placeholder.
- **Welcome screen** (`app/welcome.tsx`): First-run onboarding shown only on first launch. Checks `@soostori:firstRun` AsyncStorage flag. "Get Started" button sets flag and navigates to app.
- **Auth gate** (`app/_layout.tsx`): DB init → first-run check → welcome/auth/app flow. Wraps `MenuProvider` + `ThemeProvider` + `QueryClientProvider`.
- **MenuContext** (`src/hooks/MenuContext.tsx`): Shared menu open/close state for tab bar ↔ menu communication.

### Navigation
- **Full-page menu** (`src/components/shared/app-menu.tsx`): Slides up from bottom, dark backdrop, 5 nav items (POS/Inventory/Reports/Debt/Settings) with icons + active state, sync status + dark/light toggle in footer.
- **Custom bottom tab bar** (`app/(tabs)/_layout.tsx`): 3 visible tabs (POS/Reports/Inventory) + floating 56px orange menu button (center) that opens AppMenu overlay.
- **Floating cart FAB**: POS page shows floating action button on right edge when cart has items — item count badge + cart icon + running total.

### UI Improvements
- **ThemeContext** (`src/hooks/useTheme.tsx`): App-wide forced color scheme. Dark/light toggle now actually changes every screen simultaneously via `useTheme()` context — all 10+ components fixed.
- **AppHeader** (`src/components/shared/app-header.tsx`): Top bar with screen title + sync badge + dark/light toggle + settings gear on all 4 tab screens.
- **useColorScheme replaced**: All screens now use `useTheme()` — `pos.tsx`, `inventory.tsx`, `reports.tsx`, `debt.tsx`, `settings.tsx`, `Card.tsx`, `debt-partial-payment-modal.tsx`, `inventory-edit-modal.tsx`, `inventory-add-form.tsx`, `category-chips.tsx`.
- **sync-queue-helper.ts**: Added `getPendingSyncCount()` and `getSyncStatus()`.

### Settings
- **Full Settings page** (`app/(tabs)/settings.tsx`): Shop details, receipt config, M-Pesa channels (Send Money / Paybill / Bank / Pochi), appearance, payment channels toggle, data export/import JSON backup via expo-file-system + expo-sharing, about section.

### POS Feature Parity
- **pos.tsx**: Integrated all POS components — `HeldSalesSheet`, `PriceSelectionDialog`, search X-clear button, group price handling, out-of-stock indicators, proper `handleRecall(sale)` flow.
- **CartBar**: Recall button opens held sales sheet instead of loading last sale directly.
- **Group pricing**: Tapping a product with tiered prices opens `PriceSelectionDialog` instead of adding directly.
- **Search**: X button clears search query inline.
- **Out of stock**: Products with `trackInventory` and zero stock show "Out of stock" label and become non-tappable.
- **HeldSalesSheet**: Fixed `visible` prop (was literal string, now proper boolean binding.
- **PriceSelectionDialog**: Fixed `<Modal visible>` literal string bug.

### Inventory ( teammate worktree — pending merge)
- Full 5-step product wizard: Type (Loose/Bulk) → Details → Pricing → Distributor → Barcode.
- Inline restock panel, category management, barcode generation/scan, stock badges (OK/LOW/OUT).

### Reports (teammate worktree — pending merge)
- 5 KPI stat cards (Total/Cash/M-Pesa/Debt Sales/Debt Collected), revenue bar chart, sale list with tap-to-detail, sale detail modal with print/share, export CSV/HTML.

### Debt Management (teammate worktree — pending merge)
- Customers tab (list/add/search) + Debts tab (status filter, progress bars, payment recording), debt detail modal, add customer modal, record payment modal.

### Bug Fixes
- **held-sales-sheet.tsx**: `visible` was a literal string prop instead of boolean.
- **price-selection-dialog.tsx**: `<Modal visible` literal string — changed to `visible={true}`.
- **`src/lib/types.ts`, `src/lib/db-schema.ts`, `src/services/db-settings.ts`**: Corrupted quote syntax restored from worktree isolation issues.
- **MenuContext.tsx**: Renamed from .ts to .tsx (contains JSX).
- **`app-menu.tsx`**: Missing `useMenu` import, missing `React` import, `cacheDirectory` import paths, duplicate imports — all fixed.

### Bug Fixes
- **held-sales-sheet.tsx**: `visible` was a literal string prop instead of boolean — modal never respected parent visibility state; added `visible` to Props and passed from parent
- **price-selection-dialog.tsx**: `<Modal visible` was a literal string — changed to `visible={true}` since parent renders conditionally

### POS Feature Parity
- **pos.tsx**: Integrated all POS components — `HeldSalesSheet`, `PriceSelectionDialog`, search X-clear button, group price handling, out-of-stock indicators, proper `handleRecall(sale)` flow
- **CartBar**: Recall button now opens held sales sheet instead of loading last sale directly
- **Group pricing**: Tapping a product with tiered prices opens `PriceSelectionDialog` instead of adding directly
- **Search**: X button clears search query inline
- **Out of stock**: Products with `trackInventory` and zero stock show "Out of stock" label and become non-tappable

### Added — Screen Polish & Quality-of-Life

- **POS**: Hold Sale button saves cart to `held_sales`; Recall button loads the most recent held sale. Category filter chips at the top filter the product grid. Empty state improved with a friendly emoji illustration.
- **Inventory**: Category filter chips added. Inline Edit Product modal (instead of inline expand). Stock +/- buttons directly on each product row for quick adjustments.
- **Reports**: Text-based horizontal bar chart for payment method breakdown (cash / M-Pesa / debt). Date range display ("Showing sales from X to Y").
- **Debt**: Customer search/filter by name or phone. Partial Payment option that prompts for the amount before recording.

### Added — Services

- `src/services/db-categories.ts` — `getAllCategories()`, `createCategory()` for category CRUD
- `src/services/db-debts.ts` — `getAllDebts()`, `getDebtById()`, `createDebt()`, `recordDebtPayment()` for debt CRUD
- `src/services/db-sales.ts` — `holdSale()`, `getLastHeldSale()`, `deleteHeldSale()` for held sales
- `src/services/db-products.ts` — added `getCategories()` and `createCategory()` aliases for in-tab category management
- `src/services/db-products-mapper.ts` — extracted `mapProductRow()` helper
- `src/services/db-sales-mapper.ts` — extracted `mapSaleRow()` helper
- `src/services/sync-queue-helper.ts` — shared `queueSync()` helper across all services

### Added — Components

- `src/components/pos/category-chips.tsx` — reusable category filter chip row
- `src/components/pos/pos-checkout-modal.tsx` — extracted POS checkout + payment modal
- `src/components/inventory/inventory-edit-modal.tsx` — Edit Product modal
- `src/components/inventory/inventory-add-form.tsx` — extracted Add Product form
- `src/components/shared/debt-partial-payment-modal.tsx` — partial payment amount prompt

### Refactored

- `pos.tsx` — checkout modal moved to its own component to fit the 150-line ANPAS limit
- `inventory.tsx` — add-product form and edit-product modal extracted
- `debt.tsx` — partial payment modal extracted; switched from raw SQL to `db-debts` service
- All services now use the shared `queueSync` helper


### Added

- **Initial scaffold**: Expo SDK 57 + React Native 0.86 + TypeScript blank template
- **expo-router**: File-based routing with bottom tab navigator
- **expo-sqlite**: Offline-first SQLite database with full POS schema mirroring `soostori-desktop`
- **POS screen**: Product grid, cart, checkout (cash / M-Pesa / debt), sale completion
- **Inventory screen**: Product list, add/delete products, search, stock display
- **Reports screen**: Today's/all-time sales, payment method breakdown, daily stats cards
- **Debt screen**: Record customer debts, track payments, full/partial payment recording
- **Settings screen**: Shop name, address, phone, receipt footer configuration
- **Sync queue**: `sync_queue` table ready for future backend integration (Phase 2)

### Database Schema

Same as `soostori-desktop`:
- `products` — name, barcode, SKU, prices, stock, track_inventory, allow_single_unit_sale
- `categories` — product categories
- `sales` / `sale_items` — completed transactions
- `held_sales` — saved carts
- `stock_movements` — stock audit trail
- `customers` — debt customer records
- `debts` / `debt_payments` — debt tracking
- `shop_settings` — shop info + receipt config
- `sync_queue` — offline sync queue (future backend)

### Tech Stack

- Expo SDK 57 + React Native 0.86
- `expo-router` — file-based routing
- `expo-sqlite` — offline-first SQLite
- `expo-camera` — barcode scanning (future)
- Bottom tabs: POS / Inventory / Reports / Debt / Settings

### Scaffold finalization

- **Hooks**: `src/hooks/useProducts.ts` (React Query wrapper around `db-products`), `src/hooks/useDatabase.ts` (db readiness + handle), `src/hooks/useTranslation.ts` (`t()` + language state)
- **i18n**: `src/lib/i18n.ts` re-export shim with per-domain tables in `src/lib/i18n/{nav,pos,inv,rep,deb,set}.ts` (English + Swahili)
- **Shared components**: `src/components/shared/Button.tsx` (primary/secondary/danger/success), `src/components/shared/Card.tsx`
- **Query client**: `src/lib/query-client.ts` (shared React Query client)
- **Not-found route**: `app/+not-found.tsx` (expo-router fallback)
- **Ambient typings**: `expo-router-entry.d.ts` (declaration for `expo-router/entry`)
- **TypeScript fixes**:
  - `App.tsx` now exports default from `expo-router/entry` so `index.ts` resolves
  - `app/(tabs)/_layout.tsx` `TabIcon` accepts `ColorValue` (was rejecting `OpaqueColorValue`)
  - `src/services/db-products.ts` `updateProduct` bind array retyped from `unknown[]` to `(string|number|null)[]`
