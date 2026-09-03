# Implementation Report — inventory + auth-test (Phase 7)

## Files Changed

### CREATED

- `scripts/dryrun.ts` — verified end-to-end check of the cloud auth wiring. `cloudPing` + schema query + dynamic-import checks for `cloudSendMagicCode`, `cloudVerifyMagicCode`, `cloudDownloadEvents`, snapshot APIs. Each step wrapped in try/catch so partial failures surface cleanly.
- `app/onboarding-test.tsx` — DEV-ONLY test screen that proves the local session contract (AsyncStorage → `useEmployee` → employee + shopId) without going through magic-code auth. NOT mounted in production tab bar.

### MODIFIED

- `src/services/db-sales.ts` —
  - Added `AsyncStorage` import + `resolveShopId()` helper.
  - `createSale()` and `createSaleOffline()` now pass the resolved shopId to `recordInventoryTransaction()`, `queueSync()`, and `logAudit()` (previously hardcoded `''`).
- `src/services/db-product-variants.ts` —
  - Added `AsyncStorage` import + `recordInventoryTransaction` import + `resolveVariantShopId()` helper.
  - `adjustVariantStock()` now writes through `recordInventoryTransaction()` first (canonical event log + `products.current_stock` cache update) BEFORE maintaining the variant-local `product_variants.stock_quantity` counter. Replaced raw `INSERT INTO stock_movements` with the canonical transaction path.
- `package.json` —
  - Added `"dryrun": "tsx scripts/dryrun.ts"` script entry.
  - Added `tsx ^4.19.2` to `devDependencies`.
- `CHANGELOG.md` — Added "Phase 7 — Inventory Authority & Auth Wiring" section under `[Unreleased]`.

### VERIFIED (no fix required)

- `src/lib/db-schema.ts` — `products` table has both `stock_quantity` (legacy) and `current_stock` (cache) columns. `current_stock` is added via `ALTER TABLE` migration for existing installs.
- `src/services/db-products.ts` — `canSell()` already reads `current_stock`.
- `src/services/db-inventory-transactions.ts` — `recordInventoryTransaction()` already updates `current_stock` cache and uses `balance_after` as the canonical truth.
- `src/services/db-sales.ts:confirmPendingSale` — already passes `String(saleRow.shop_id)` to `recordInventoryTransaction()`; saleId used as `referenceId`. No fix needed.

## Plan Checklist Status

- [x] Inventory authority — Phase 7 verified; `products` has both columns, `canSell` uses `current_stock`, `recordInventoryTransaction` updates `current_stock` cache, `inventory_transactions.balance_after` is canonical.
- [x] `db-product-variants.adjustVariantStock` now routes through `recordInventoryTransaction()`; no raw `INSERT INTO stock_movements` for variants; `product_variants.stock_quantity` maintained as variant-local counter.
- [x] `createSale`, `createSaleOffline`, `confirmPendingSale` all use `recordInventoryTransaction()` for stock deduction with `sale_id` as `referenceId`.
- [x] `createSale` / `createSaleOffline` now resolve the real shopId from `AsyncStorage` (`@soostori:shopId`) instead of empty string. `queueSync()` receives explicit shopId.
- [x] `scripts/dryrun.ts` created; `npm run dryrun` entry added; `tsx` added as devDependency.
- [x] `app/onboarding-test.tsx` created, marked DEV-ONLY in code + CHANGELOG.
- [x] `npx tsc --noEmit` passes (exit 0) after all changes.

## Deviations From Plan

- The plan example used a single combined `import` block in `dryrun.ts`. I split it into per-step dynamic imports wrapped in `checkAvailable()` so a partial failure (e.g., missing cloud creds) does not abort the rest of the run — better evidence that the wiring is intact.
- `db-product-variants.adjustVariantStock` calls `recordInventoryTransaction()` which updates `products.current_stock` as a side effect. For variant-only stock changes, this means the parent product's `current_stock` cache also shifts. The variant-local `product_variants.stock_quantity` is then written separately. This matches the canonical-path intent (single event log) without dropping the per-SKU counter that the POS relies on.
- Did not extract `resolveShopId()` into a separate file. The ANPAS naming rule forbids generic helpers, and a domain-specific name (`shop-context-resolve.ts`) would touch files outside my slice. The 4-line helper lives in the two files that need it.

## Blockers / Known Issues

- **db-sales.ts is 388 lines** — pre-existing violation of the 150-line ANPAS rule (was 380 lines before my changes; I added 8). The file's bulk is in unmapped/legacy code that is outside this slice's scope. Refactoring it would require touching `getSaleById`, `getTodaySales`, `getReceiptHistory`, `createPendingSale`, etc. — all outside my ownership. Not fixed in this pass to avoid scope creep.
- **Worktree's package.json is incomplete**: missing `@fidscript/instant-react`, `@instantdb/react-native`, `react-native-ble-plx` even though the source code uses them. `npx tsc --noEmit` still passes because TypeScript resolves modules from the parent worktree's `node_modules` via ancestor walk. If the worktree ever runs `npm install` cleanly with its own lock file, the cloud-`*` files will break. This is a pre-existing inconsistency between the worktree and the shared checkout.
- **`@fidscript/instant-react` not added to worktree package.json**: out of scope (only `tsx` was explicitly authorized as a new devDep). The parent package.json already lists it. Adding it here would touch the package.json in ways the parent and worktree would disagree on.
