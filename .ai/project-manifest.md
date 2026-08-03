# System Overview

**Purpose:** Standalone Expo mobile POS app for shop attendants — works completely offline, same SQLite schema as `soostori-desktop`.

**Version:** 0.1.0 (initial scaffold)

**Last Updated:** 2026-07-31

---

## Core Domains

- **POS:** Point of sale screen — product grid, cart, checkout (cash/M-Pesa/debt)
- **Inventory:** Product list, add/edit/delete, stock adjustments
- **Reports:** Daily sales summary, payment method breakdown
- **Debt:** Customer debt tracking, record payments
- **Settings:** Shop info, hardware config
- **Sync:** Offline-first writes → `sync_queue` table for future backend sync (Phase 2)

---

## Critical Flows

### Offline Sale Flow
```
User scans barcode → Product matched
    → Cart updated (state)
    → Checkout → Save to expo-sqlite (instant)
    → Insert into sync_queue (for future backend)
    → UI updates immediately — no network needed
```

### Local Database Init
```
App start → expo-sqlite opens local DB
    → Run migrations (schema sync with soostori-desktop)
    → Seed initial data if empty
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Expo SDK 57 | 57.x |
| Runtime | React Native | 0.86 |
| Router | expo-router (file-based) | 6.x |
| Database | expo-sqlite | latest |
| Camera | expo-camera (barcode scanning) | latest |
| Language | TypeScript | 5.x |
| State | React Query (planned) | — |

---

## Project Structure

```
soostori-mobile/
├── app/                        # expo-router file-based routing
│   ├── _layout.tsx
│   ├── (tabs)/                 # Bottom tab navigator
│   │   ├── _layout.tsx
│   │   ├── pos.tsx
│   │   ├── inventory.tsx
│   │   ├── reports.tsx
│   │   ├── debt.tsx
│   │   └── settings.tsx
│   └── +not-found.tsx
├── src/
│   ├── lib/                    # Shared utilities
│   │   ├── types.ts            # TS types (same as desktop schema)
│   │   ├── db.ts               # expo-sqlite init + schema
│   │   ├── i18n.ts             # Translations
│   │   └── constants.ts        # App constants
│   ├── services/               # DB operations
│   │   ├── db-products.ts
│   │   ├── db-sales.ts
│   │   ├── db-debts.ts
│   │   └── sync-queue.ts       # Sync queue for future backend
│   ├── hooks/                  # React hooks
│   │   ├── useProducts.ts
│   │   ├── useCart.ts
│   │   └── useDatabase.ts
│   └── components/             # UI components
│       ├── shared/
│       ├── pos/
│       └── inventory/
├── docs/                       # Feature READMEs (from desktop)
├── .ai/                       # AI OPERATING LAYER (ANPAS)
├── CLAUDE.md                  # This file
├── CHANGELOG.md
└── package.json
```

---

## SQLite Schema (mirrors soostori-desktop)

Tables: `products`, `categories`, `sales`, `held_sales`, `stock_movements`, `shop_settings`, `sync_queue`.

---

## Entry Points

### For Humans
- Start here: `README.md`
- Architecture: `docs/ARCHITECTURE.md`

### For AI Agents
- First read: `CLAUDE.md` (root)
- Coding rules: `.ai/coding-rules.md`
- Review checklist: `.ai/review-checklist.md`

---

## Quick Navigation

| If you need to... | Go to... |
|-------------------|----------|
| Understand the project | `CLAUDE.md` |
| Modify POS | `app/(tabs)/pos.tsx`, `src/components/pos/` |
| Modify inventory | `app/(tabs)/inventory.tsx`, `src/components/inventory/` |
| Modify DB operations | `src/services/` |
| Modify schema | `src/lib/db.ts` |
| See recent changes | `CHANGELOG.md` |