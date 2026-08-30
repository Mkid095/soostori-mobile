# Changelog

All notable changes to this project will be documented in this file.

## [1.1.1] — 2026-08-30

### Critical POS Bug Fixes

**Stock validation on sale** (`src/services/db-sales.ts`):
- `InsufficientStockError` class thrown before sale record is created when any cart item exceeds available stock
- `canSell(productId, qty)` helper in `db-products.ts` checks `stock_quantity >= qty`

**Checkout cart stock warnings** (`src/components/pos/pos-checkout-modal.tsx`):
- Cart item rows now highlight in amber border when quantity exceeds `trackInventory` stock
- "Only X in stock" text shown below price in cart row
- `InsufficientStockError` caught at checkout with descriptive alert

**Barcode scan wizard protection** (`src/components/inventory/step-barcode.tsx`):
- Manual barcode TextInput now has `onSubmitEditing` with `e.preventDefault()` to stop Enter key from advancing wizard
- `returnKeyType="done"` set on barcode manual input

**Duplicate product prevention — auto-suggest** (`src/components/inventory/`):
- `product-suggest.tsx` — new dropdown component showing up to 5 name/sku/barcode matches
- `step-details.tsx` — name input debounces 300ms, calls `searchProducts()`, shows suggestions below field
- `wizard-types.ts` — `WizardProps.onSelectSuggestion` prop added
- `inventory-wizard.tsx` — `onSelectSuggestion` threaded through to details step
- `inventory-add-form.tsx` — passes `onSelectSuggestion` to wizard; selecting a suggestion closes add wizard and opens edit form
- `inventory.tsx` — add form's `onSelectSuggestion` wired to `setEditing(product)`

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
- 5 nav items: POS, Inventory, Reports, Debt, Settings — with active state (brand color pill)
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

| File | Fix |
|------|-----|
| `app/(tabs)/settings.tsx` | `inputStyle` bg `#f8fafc` → `cardBg`; borders `#e2e8f0` → `border`; shop/receipt cards → `cardBg` + `border`; save button → `brand` |
| `settings-section-card.tsx` | Card bg `#fff` → `card`; chevron `#d1d5db` → `muted` |
| `settings-modal.tsx` | Header icon circle `#f97316` → `brand` |
| `appearance-section.tsx` | Switch track `#e2e8f0` → `border` |
| `security-section.tsx` | Switch track `#e2e8f0` → `border` |
| `data-management-section.tsx` | Import button bg `#f1f5f9` → `bg` |
| `app/(tabs)/pos.tsx` | Search bar bg → `bg` |
| `pos-cart-bar.tsx` | `backgroundColor` → `card` prop; added `card` to Props |
| `app/(tabs)/debt.tsx` | Progress bar bg → `border` |
| `filter-row.tsx` | Date filter btn bg → `bg`; PaymentFilter pill bg → `bg`; icons → `textMuted` |
| `simple-bar-chart.tsx` | All hardcoded text/bar colors → theme `text`, `textSecondary`, `card` |
| `app-menu-item.tsx` | All `#f97316` brand hexes → `brand` prop; inactive text → theme `text` |
| `app-menu.tsx` | Sync colors `#f97316`/`#22c55e` → `brand`/`success` |

---

### Fixed

- **Payment settings blank screen**: `shop_settings` table had no default row — `getShopSettings()` returned `null`. Fixed by adding `INSERT OR IGNORE INTO shop_settings (id) VALUES ('default')` in `initSchema()` so the row is seeded on first launch
- **`utils.ts` ANPAS violation**: Renamed to `src/lib/formatters.ts`; all 24 imports across the codebase updated
- **Over-limit files**: Split `printer-section.tsx` (223→138), `scanner-section.tsx` (163→74), `payment-channels-section.tsx` (165→111) into domain-specific subcomponents (`printer-option`, `printer-discovery-panel`, `scanner-option`, `scanner-device-panel`, `payment-phone-field`, `payment-paybill-field`)
- **Hardcoded colors**: Replaced `#ef4444` with `danger` theme in `scanner-section.tsx`, `update-checker.tsx`; replaced `#16a34a` with `success` theme in `update-checker.tsx`
- **Emoji in UI (ANPAS violation)**: Replaced `🖨` → `Printer` lucide icon, `📡` → `Bluetooth` lucide icon, `✕` → `X` lucide icon, `›` → `ChevronRight` lucide icon in settings components
- **Ellipsis in UI text**: Replaced `…` with `...` in `printer-discovery-panel.tsx` and `scanner-device-panel.tsx`

---

## [1.0.0] — 2026-08-05

### Biometric Authentication

**Auth screen** (`app/auth.tsx`):
- Integrated `expo-local-authentication` for fingerprint/face login
- Biometric button on PIN keypad — prompts system auth on tap
- Falls back to PIN on failure or if not set up
- Status hints: unavailable/not_enrolled/ready/enabled

**Settings** (`app/(tabs)/settings.tsx`):
- Added "Biometric Authentication" toggle in Security section
- Shows hardware status: Not available / Not enrolled / Ready
- Saves `biometric_enabled` to `shop_settings` table

### Navigation & Menu

- **AppMenu** (`src/components/app-menu.tsx`): Slides up from bottom, dark backdrop, 5 nav items with active state, sync status + theme toggle in footer
- **Tab layout** (`app/(tabs)/_layout.tsx`): 3 visible tabs (POS/Reports/Inventory) + floating orange center FAB menu button
- **AppHeader**: Top bar with sync badge, dark/light toggle, settings gear on all pages
- **Floating cart FAB**: POS page shows floating action button on right edge when cart has items

### UI Improvements

- **ThemeContext** (`src/hooks/useTheme.tsx`): App-wide forced color scheme. Dark/light toggle changes every screen via `useTheme()` context
- **AppHeader**: Top bar with screen title + sync badge + dark/light toggle + settings gear
- **useColorScheme replaced**: All screens now use `useTheme()` — `pos.tsx`, `inventory.tsx`, `reports.tsx`, `debt.tsx`, `settings.tsx`, etc.

### Settings

- **Full Settings page** (`app/(tabs)/settings.tsx`): Shop details, receipt config, M-Pesa channels, appearance, payment channels toggle, data export/import JSON backup, about section

### POS Feature Parity

- **pos.tsx**: Integrated all POS components — HeldSalesSheet, PriceSelectionDialog, search X-clear, group pricing, out-of-stock indicators
- **CartBar**: Recall button opens held sales sheet
- **Group pricing**: Tapping product with tiered prices opens PriceSelectionDialog
- **HeldSalesSheet**: Fixed `visible` prop boolean binding

### Inventory

- Full 5-step product wizard: Type (Loose/Bulk) → Details → Pricing → Distributor → Barcode
- Inline restock panel, category management, barcode generation/scan
- ConfirmModal for delete confirmation

### Reports

- KPI stat cards (Total/Cash/M-Pesa/Debt Sales/Debt Collected)
- Revenue bar chart, sale list with tap-to-detail
- Sale detail modal with print/share
- Export CSV/HTML

### Debt Management

- Customers tab (list/add/search) + Debts tab (status filter, progress bars, payment recording)
- Debt detail modal, add customer modal, record payment modal

### Services Added

- `src/services/db-categories.ts` — `getAllCategories()`, `createCategory()`
- `src/services/db-customers.ts` — Full customer CRUD
- `src/services/db-debts.ts` — `getAllDebts()`, `getDebtById()`, `createDebt()`, `recordDebtPayment()`, `getTotalDebtCollected()`, `getDebtCollectedByDateRange()`
- `src/services/db-sales.ts` — `holdSale()`, `getLastHeldSale()`, `deleteHeldSale()`, `getWeekSales()`, `getMonthSales()`
- `src/services/sync-queue-helper.ts` — `getPendingSyncCount()`, `getSyncStatus()`

### Components Added

- `src/components/auth/pin-keypad.tsx` — PIN pad with biometric button
- `src/components/settings/security-section.tsx` — Biometric toggle UI
- `src/components/settings/payment-channels-section.tsx` — Payment method toggles
- `src/components/settings/data-management-section.tsx` — Export/import backup
- `src/components/settings/shop-details-form.tsx` — Shop details fields
- `src/components/settings/mpsesa-config.tsx` — M-Pesa config fields
- `src/components/settings/appearance-section.tsx` — Dark mode toggle
- `src/components/shared/confirm-modal.tsx` — Reusable confirm dialog
- `src/components/pos/category-chips.tsx` — Category filter chips
- `src/components/pos/pos-checkout-modal.tsx` — Checkout + payment modal
- `src/components/inventory/inventory-search-bar.tsx` — Search + category + add
- `src/components/inventory/inventory-product-list.tsx` — Product FlatList
- `src/components/shared/debt-partial-payment-modal.tsx` — Partial payment prompt

### Initial Scaffold

- Expo SDK 57 + React Native 0.86 + TypeScript
- `expo-router` — file-based routing
- `expo-sqlite` — offline-first SQLite (same schema as soostori-desktop)
- Bottom tabs: POS / Inventory / Reports / Debt / Settings
- `sync_queue` table ready for Phase 2 backend integration
