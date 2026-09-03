---
name: soostori-mobile-conventions
description: Non-obvious conventions and gotchas for the Soostori Mobile Expo app
metadata:
  type: project
---

When working in `soostori-mobile/`:

- **ANPAS rule: 150 lines per file.** This is enforced per CLAUDE.md and AGENTS.md. Some pre-existing files already violate this (e.g., `src/services/db-sales.ts` is ~388 lines as of 2026-09-03). Do NOT try to refactor those in a feature-implementer slice — it explodes scope. Document the violation in the implementation report and move on.

- **Inventory authority:** `inventory_transactions.balance_after` is the canonical truth for stock. `products.current_stock` is a cache, updated by `recordInventoryTransaction()`. `product_variants.stock_quantity` is a variant-local counter (variants track stock per SKU). Use `recordInventoryTransaction()` for ALL stock changes — never raw `UPDATE products SET stock_quantity`. See [[soostori-mobile-conventions]] for the full chain.

- **shopId resolution for stock writes:** `recordInventoryTransaction(shopId, ...)` must receive the real shopId. Read it from `AsyncStorage.getItem('@soostori:shopId')`. Both `createSale` and `createSaleOffline` had a bug where they passed `''`. Fixed 2026-09-03.

- **Worktree isolation has package.json inconsistencies.** When running as an isolated worktree agent, the worktree's `package.json` may be missing deps that the source code uses (`@fidscript/instant-react`, `@instantdb/react-native`, `react-native-ble-plx`). TypeScript still resolves them via ancestor `node_modules` walk from the parent shared checkout, so `npx tsc --noEmit` passes — but a clean `npm install` in the worktree would break. Do NOT add those deps to the worktree's package.json unless explicitly authorized; they already exist in the parent's.

- **`tsx` is a useful devDep.** `scripts/dryrun.ts` was added with `tsx` as devDep + `npm run dryrun` script. Pattern is OK to extend for other dev-time smoke tests.

- **DEV-ONLY screens** go under `app/` with a `// DEV-ONLY` comment at the top. They are NOT mounted in any production tab bar. Use `expo-router push /path` to navigate manually during development. Example: `app/onboarding-test.tsx`.

- **Files to never touch as the inventory/test agent:** `src/services/cloud-auth.ts`, `cloud-sync-api.ts`, `cloud-snapshot.ts`, `db-customers.ts`, `db-clients.ts`, `subscription-guard.ts`, `sync-cursor.ts`, `sync-queue-helper.ts`, `sync-queue-processor.ts`, `src/hooks/useCloudSync.ts`, `useDeviceHeartbeat.ts`, `app/_layout.tsx`, `src/lib/db.ts`.
