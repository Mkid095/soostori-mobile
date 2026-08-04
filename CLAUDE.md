# Soostori Mobile — Offline-First POS App

**Standalone Expo app for Android/iOS — full offline POS, same schema as soostori-desktop.**

> **STRICT RULE — READ BEFORE ANY WORK:** This project follows ANPAS (AI-Native Project Architecture Standard). All AI agents doing development work in this codebase MUST follow the rules in `.ai/coding-rules.md` and verify their work against `.ai/review-checklist.md` BEFORE declaring done. Non-compliance is not optional.

---

## What This Is

A mobile POS app for shop attendants. Works completely offline — no internet required for any POS operation. Sync with the backend comes later (Phase 2 of the backend integration).

**Tech stack:**
- Expo SDK 57 + React Native 0.86
- `expo-sqlite` — offline-first local database (same schema as `soostori-desktop`)
- `expo-router` — file-based routing
- `expo-camera` — barcode scanning
- Bottom tabs — POS / Inventory / Reports / Debt / Settings

**This repo is standalone.** It does NOT connect to any backend yet. When backend is ready, an API sync layer is added — the SQLite schema is already designed for it.

---

## ANPAS — Non-Negotiable Rules

| Rule | Limit | Enforcement |
|------|-------|-------------|
| Max file size | **150 lines** | Count before committing |
| File naming | `[domain]-[action]-type.ts` | No helpers.ts, common.ts, utils.ts |
| Business logic | **NEVER** in React components | Only in `src/lib/` or `src/services/` |
| UI components | NEVER contain API calls, validation, or business logic | Only rendering + event emission |
| Generic utilities | **FORBIDDEN** | helpers.ts, common.ts, misc.ts, tools.ts do not exist |
| TypeScript | Strict — no `any`, no implicit `any` | `npx tsc --noEmit` must pass |
| CHANGELOG.md | **UPDATE ON EVERY COMMIT** | Every change documented |

---

## Project Structure

```
soostori-mobile/
├── app/                        # expo-router file-based routing
│   ├── _layout.tsx            # Root layout with providers
│   ├── (tabs)/                # Bottom tab navigator
│   │   ├── _layout.tsx        # Tab navigator config
│   │   ├── pos.tsx           # Point of Sale screen
│   │   ├── inventory.tsx      # Inventory management
│   │   ├── reports.tsx        # Sales reports
│   │   ├── debt.tsx          # Debt management
│   │   └── settings.tsx       # App settings
│   └── +not-found.tsx
├── src/
│   ├── lib/
│   │   ├── types.ts           # TypeScript types (same as desktop schema)
│   │   ├── db.ts             # expo-sqlite database init + schema
│   │   ├── i18n.ts          # Translations (copied from desktop)
│   │   └── constants.ts       # App constants
│   ├── services/
│   │   ├── db-products.ts     # Product CRUD operations
│   │   ├── db-sales.ts       # Sale CRUD operations
│   │   ├── db-debts.ts       # Debt CRUD operations
│   │   └── sync-queue.ts     # Sync queue (for future backend)
│   ├── hooks/
│   │   ├── useProducts.ts    # React Query hooks for products
│   │   ├── useCart.ts        # Cart state management
│   │   └── useDatabase.ts    # Database initialization hook
│   └── components/
│       ├── shared/            # Shared UI components
│       ├── pos/               # POS-specific components
│       └── inventory/         # Inventory-specific components
├── docs/                      # Copied from soostori-desktop
├── CLAUDE.md                  # This file
├── CHANGELOG.md
└── package.json
```

---

## SQLite Schema (same as soostori-desktop)

Mirrors `soostori-desktop`'s `electron/database/schema-pos.ts`:

```sql
products (id, name, barcode, sku, category, cost_price, selling_price,
          stock_quantity, low_stock_threshold, track_inventory,
          allow_single_unit_sale, image_url, distributor_name,
          distributor_phone, is_active, created_at, updated_at)

categories (id, name, color, created_at)

sales (id, items, items_summary, subtotal, discount_amount,
       total_amount, payment_method, mpesa_receipt,
       customer_id_number, note, created_at)

held_sales (id, items, created_at)

stock_movements (id, product_id, quantity, reason, reference_id, created_at)

shop_settings (id, shop_name, address, phone, currency, receipt_footer,
              low_stock_default, mpesa_till, mpesa_paybill, mpesa_account,
              updated_at)

sync_queue (id, table_name, action, payload, status, created_at, synced_at)
```

---

## How to Run

```bash
cd soostori-mobile
npm install
npx expo start        # Development
npx expo run:android  # Build and run on Android
npx expo run:ios      # iOS (macOS only)
```

---

## Screens

1. **POS** — Product grid, cart, checkout (cash / M-Pesa / debt)
2. **Inventory** — Product list, add/edit/delete, stock adjustments
3. **Reports** — Daily sales summary, payment method breakdown
4. **Debt** — Customer debt tracking, record payments
5. **Settings** — Shop info, hardware config (future)

---

## Offline-First

Every write:
1. Saves to local `expo-sqlite` immediately — instant UI
2. Inserts into `sync_queue` table for future backend sync

No backend calls until Phase 2. The `sync_queue` table is ready — when backend is connected, a sync worker processes the queue.

---

## Docs

All feature READMEs are in `docs/` (copied from `soostori-desktop`):
- `POS-README.md`
- `Inventory-README.md`
- `Debt-README.md`
- `Reports-README.md`
- `Settings-README.md`
- `ARCHITECTURE.md` — full platform architecture
