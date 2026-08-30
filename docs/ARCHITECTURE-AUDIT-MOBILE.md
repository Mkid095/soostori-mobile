# Soostori Mobile — Architecture Audit Report

**Against the new Soostori cloud-architecture model.**
**Date:** 2026-08-30
**Auditor:** Claude Code

---

## Architecture Model Being Audited Against

```
                    SOOSTORI CLOUD (Instant DB)
                         |
         Web Dashboard / Admin / Subscription / Backup / History
                         |
              DESKTOP (Operational Host, LAN authority)
                    ↕ LAN    ↕ LAN
              MOBILE (Operational Client, offline-first)

              Cloud sync (backup/restore/subscription) ↕
```

**Three clear responsibilities:**
- Web = cloud identity + subscription + backup + history + owner visibility
- Desktop = operational POS + local host + LAN authority
- Mobile = operational POS client + offline-first

---

## 1. Authentication

### CURRENT IMPLEMENTATION

- `app/auth.tsx` fetches employees from local SQLite
- PIN validation uses a **weak hash** — `SHA-256(pin + salt)`, not PBKDF2
- Fallback: `newPin === '0000'` allows universal override
- No Instant DB / cloud authentication at all
- Session stored as `employeeId` + `role` in AsyncStorage

### REQUIRED BEHAVIOR

- Authenticate against Instant DB on first login
- Receive signed/validated subscription entitlement
- Cache entitlement locally for offline enforcement
- 3-day online verification window tracked

### GAP

**CRITICAL.** The entire authentication model is local-only. The app creates its own shop identity with no cloud involvement.

### FILES INVOLVED

- `app/auth.tsx` — must be rewritten to use cloud auth
- `app/_layout.tsx` — `FIRST_RUN_KEY` flow bypasses cloud
- `app/welcome.tsx` — no Instant DB login

### RISK

**Critical.** App can run entirely offline from day one with no cloud identity. Subscription enforcement is impossible. An expired subscriber could use the app indefinitely.

---

## 2. First-Run Flow

### CURRENT IMPLEMENTATION

`welcome.tsx` → "Get Started" → sets `FIRST_RUN_KEY = false` → routes to `/auth` → local employee select + PIN login.

### REQUIRED BEHAVIOR

**Online-required first-run:**
1. App launches → "Welcome to Soostori"
2. Two options: **"Login with Online Account"** or **"Join Existing Shop"**
3. Online login → Instant DB auth → verify subscription → download shop profile → initialize local DB → operational
4. Employee invitation → online verification → device authorization → download permissions → operational
5. No path for offline-only shop creation

### GAP

**CRITICAL.** `welcome.tsx` has no cloud interaction whatsoever. The "Get Started" button immediately goes to local auth. There is no Instant DB integration anywhere in the app.

### FILES INVOLVED

- `app/welcome.tsx` — must be replaced with cloud-first flow
- `app/_layout.tsx` — `FIRST_RUN_KEY` logic must change

### RISK

**Critical.** The architecture says first-run MUST be online. Current implementation allows fully offline first-run with no cloud identity.

---

## 3. Local Shop Creation

### CURRENT IMPLEMENTATION

The app supports creating employees and a local shop entirely offline via `db-employees.ts`, `db-shops.ts`. The `welcome.tsx` → `auth.tsx` path is a local shop creation flow.

### REQUIRED BEHAVIOR

**No independent local shop creation.** A shop must be created online (via web/Instant DB). Desktop and mobile must authenticate against an existing cloud shop. No local-first shop creation path for normal operation.

### GAP

**CRITICAL.** `welcome.tsx` and `auth.tsx` support creating a complete offline shop with employees and PINs, entirely disconnected from Instant DB.

### FILES INVOLVED

- `app/welcome.tsx`
- `app/auth.tsx`
- `src/services/db-shops.ts`
- `src/services/db-employees.ts`
- `src/lib/db-schema.ts` (shops, employees tables seeded locally)

### RISK

**Critical.** Directly contradicts the new architecture. Must be removed or made admin-only with clear documentation that this is recovery-only.

---

## 4. Employee/Invitation Flow

### CURRENT IMPLEMENTATION

- Owner creates employees in `team-section.tsx`
- Generates 6-digit code stored in local `invitations` table
- Employee enters code in `join-shop-sheet.tsx`
- Device registers via HTTP to host, creates `device_pairings` entry
- Owner approves in `pairing-requests-sheet.tsx`

### REQUIRED BEHAVIOR

- Invitation must be issued by the cloud (web/Instand DB)
- Employee authenticates online with the invitation code
- Permissions and shop configuration downloaded from cloud
- Device pairing authorized by owner online, recorded in Instant DB

### GAP

**MAJOR.** Invitation system exists but is entirely local to the LAN. The `invitations` table has no connection to Instant DB. Cloud doesn't know about employees or devices.

### FILES INVOLVED

- `src/components/settings/team-section.tsx`
- `src/components/shared/join-shop-sheet.tsx`
- `src/services/db-pairings.ts`

### RISK

**Major.** A device paired via this flow is trusted locally but not recognized by the cloud. On device replacement, the cloud has no record of the device or its permissions.

---

## 5. Device Identity

### CURRENT IMPLEMENTATION

- `lan-client.ts` generates `deviceId` via `generateId()` which uses `Math.random()` — not cryptographically random
- Stored in AsyncStorage as `@soostori:deviceId`
- No cloud registration

### REQUIRED BEHAVIOR

- Device identity generated cryptographically (`crypto.getRandomValues`)
- Device registered with cloud on first online auth
- Cloud returns a signed device token used for LAN pairing
- Device replacement requires re-authorization via cloud

### GAP

**MAJOR.** `Math.random()` is not suitable for device identity. A cloned database could replicate device identity. No cloud device registry.

### FILES INVOLVED

- `src/services/lan-client.ts` — `init()` method
- `src/lib/formatters.ts` — `generateId()` uses weak randomness

### RISK

**Major.** Device identity collision is low-probability but security-relevant. Device replacement without cloud authorization is unsupported.

---

## 6. Device Pairing

### CURRENT IMPLEMENTATION

- HTTP POST to `http://<server_ip>:18792/api/pair` with `{ deviceId, deviceName, deviceType }`
- No device token, no authentication
- Anyone on the LAN can call this endpoint
- Creates `device_pairings` entry locally on host

### REQUIRED BEHAVIOR

- Device pairing requires authenticated connection (device token)
- Host must approve and the approval must be recorded in Instant DB
- Device token exchanged during successful pairing for future connections

### GAP

**MAJOR.** No device token. No authentication on the pairing endpoint. No Instant DB record of device pairing.

### FILES INVOLVED

- `src/services/lan-client.ts` — `requestPairing()`
- `src/services/lan-server.ts` — `/api/pair` handler

### RISK

**Major.** Anyone on the LAN can register a device with the host. Should require the device to present a token from the cloud.

---

## 7. Subscription Enforcement

### CURRENT IMPLEMENTATION

**Not implemented.** No subscription check anywhere in the app.

### REQUIRED BEHAVIOR

- Cloud is authoritative for subscription state
- App caches subscription entitlement locally after online auth
- Subscription checked online at least every 3 days
- If 3-day window expires → app enters restricted/locked state
- Clock tampering considered in security design

### GAP

**CRITICAL.** Completely unimplemented. App runs with no subscription check.

### FILES INVOLVED

- All auth-adjacent files (none currently check subscriptions)

### RISK

**Critical.** No subscription enforcement possible. Expired subscribers can use the app indefinitely.

---

## 8. Offline Entitlement

### CURRENT IMPLEMENTATION

**Not implemented.** App runs in "always operational" mode with no entitlement cache.

### REQUIRED BEHAVIOR

- After first online auth, app caches entitlement locally
- Within valid window: full operation without internet
- After window expires: restricted state until online verification
- Owner-only re-verification requirement (not cashier)

### GAP

**CRITICAL.** Same as item 7 — no offline entitlement model.

### RISK

**Critical.** Same as item 7.

---

## 9. 3-Day Online Verification

### CURRENT IMPLEMENTATION

**Not implemented.** No timestamp tracking of last online verification.

### REQUIRED BEHAVIOR

- Store `lastSubscriptionCheck` timestamp locally
- On app open (for owner accounts): check if > 3 days since last online check
- If yes and online: verify subscription with cloud
- If no internet: allow operation but show "verification needed" warning
- If expired: lock the app until verified

### GAP

**CRITICAL.** Not implemented.

### RISK

**Critical.** No mechanism to enforce subscription window.

---

## 10. LAN Sync

### CURRENT IMPLEMENTATION

- `lan-client.ts` WebSocket connects to `ws://<server_ip>:18792/ws`
- Sequence number tracking for event replay
- Handles: `SALE_CONFIRMED`, `SALE_REJECTED`, `STOCK_UPDATED`, `DEVICE_PAIRED`
- `HOST_HEARTBEAT` defined in protocol but **not processed** by client
- `SALE_RECONCILIATION_REQUIRED` defined in protocol but **not processed** by client

### REQUIRED BEHAVIOR

- Desktop is only host (enforced)
- All sync events processed including heartbeat and conflict events
- Connection status exposed to UI (connected / host unavailable / reconnecting)

### GAP

**MODERATE.** Core LAN sync works but heartbeat and reconciliation events are not handled by the client.

### FILES INVOLVED

- `src/services/lan-client.ts` — `handleEvent()` switch statement
- `src/hooks/useLanSync.ts`

### RISK

**Moderate.** Mobile won't show "host unavailable" indicator. Conflicts won't be surfaced to the user.

---

## 11. Cloud Sync Readiness

### CURRENT IMPLEMENTATION

- `sync_queue` table exists with `sync-queue-helper.ts`
- `sync_queue` is **never processed** — nothing reads from it and sends to the cloud
- No Instant DB client anywhere in the codebase
- No cloud sync implementation

### REQUIRED BEHAVIOR

- `sync_queue` processed by a sync worker when internet is available
- Events sent to Instant DB REST API or Instant DB sync layer
- Incremental sync using sequence numbers or timestamps
- Full snapshot available for device replacement recovery

### GAP

**CRITICAL.** Cloud sync does not exist. All data stays local.

### FILES INVOLVED

- `src/services/sync-queue-helper.ts`
- `src/lib/db-schema.ts`

### RISK

**Critical.** No cloud backup. If a device is lost, data is not recoverable from the cloud.

---

## 12. Data Backup/Restore

### CURRENT IMPLEMENTATION

**Not implemented.** No Instant DB integration. No cloud backup mechanism.

### REQUIRED BEHAVIOR

- On new device login: download full shop data snapshot from cloud
- Ongoing: incremental backup of all operational data to cloud
- On device replacement: restore from cloud snapshot
- Employee can reinstall app and recover operational state from cloud

### GAP

**CRITICAL.** No recovery path if device is lost.

### RISK

**Critical.** Device loss = permanent data loss.

---

## 13. Sale Synchronization

### CURRENT IMPLEMENTATION

- `lan-client.ts` `emitSalePending()` sends `SALE_PENDING` to host
- `applySaleConfirmed()` updates `status = 'confirmed'` and deducts `stock_quantity` (NOT `current_stock`)
- `applySaleRejected()` updates `status = 'rejected'`
- `SALE_RECONCILIATION_REQUIRED` received but **not handled**

### REQUIRED BEHAVIOR

- SALE_CONFIRMED should update `current_stock` via `recordInventoryTransaction`, not raw SQL
- SALE_RECONCILIATION_REQUIRED should surface to conflict resolution UI
- Offline sale reconciliation should be explicit (partial fulfill or cancel)

### GAP

**MODERATE.** `applySaleConfirmed` deducts `stock_quantity` directly instead of going through `recordInventoryTransaction`, bypassing the inventory event sourcing chain.

### FILES INVOLVED

- `src/services/lan-client.ts` — `applySaleConfirmed()`

### RISK

**Moderate.** Inventory event sourcing breaks when applying confirmed remote sales.

---

## 14. Inventory Synchronization

### CURRENT IMPLEMENTATION

- `applyStockUpdated()` in `lan-client.ts` updates `stock_quantity` directly
- `recordInventoryTransaction()` exists but remote events bypass it

### REQUIRED BEHAVIOR

- Remote stock updates should call `recordInventoryTransaction()` for proper event sourcing
- `current_stock` must stay in sync with `inventory_transactions`

### GAP

**MODERATE.** Same as item 13 — `current_stock` cache can get out of sync with transaction history.

### RISK

**Moderate.** `current_stock` and `inventory_transactions` can diverge.

---

## 15. Customer Synchronization

### CURRENT IMPLEMENTATION

**Not implemented.** No customer sync to cloud. No `sync_queue` processor.

### REQUIRED BEHAVIOR

- Customers synced to cloud for owner visibility and cross-device access
- Customer history available on web dashboard

### GAP

**Minor (for mobile).** Mobile doesn't add/edit customers in current scope. Not critical for Phase 1.

### RISK

**Low.**

---

## 16. Employee/Permission Synchronization

### CURRENT IMPLEMENTATION

- Employees stored locally in `employees` table
- No sync to cloud
- Permissions (role-based menu filtering) handled locally via `useEmployee.ts`

### REQUIRED BEHAVIOR

- Employee records originate in the cloud (created by owner on web or desktop)
- Mobile downloads permissions on first login
- Role changes propagate from cloud

### GAP

**MAJOR.** Employees are created locally in the mobile/desktop app, not from cloud. Owner should create employees on the web.

### FILES INVOLVED

- `src/services/db-employees.ts`
- `src/hooks/useEmployee.ts`

### RISK

**Major.** Employees created on mobile are not recognized by cloud. On reinstall, they disappear.

---

## 17. Audit Logs

### CURRENT IMPLEMENTATION

- `audit_logs` table exists in schema
- `db-audit.ts` service exists
- **Nothing currently writes to it** — `createEmployee`, `createSale`, `adjustStock` do NOT call `writeAuditLog`

### REQUIRED BEHAVIOR

- All significant mutations logged: price changes, stock adjustments, employee changes, device pairings
- Audit logs synced to cloud for owner visibility

### GAP

**MODERATE.** Audit table exists but is not populated. Dead code.

### FILES INVOLVED

- `src/services/db-employees.ts` — should log employee creation
- `src/services/db-sales.ts` — should log sales
- `src/services/db-products.ts` — should log price/stock changes

### RISK

**Moderate.** No audit trail for business operations. Important for accountability.

---

## 18. Device Replacement/Recovery

### CURRENT IMPLEMENTATION

**Not implemented.** No path to recover device identity or shop state from cloud.

### REQUIRED BEHAVIOR

- New device: owner logs in online → cloud authenticates → downloads shop snapshot → device re-initialized
- Employee reinstall: re-authenticate with cloud → re-download permissions and data

### GAP

**CRITICAL.** No recovery path.

### RISK

**Critical.** Lost device = lost data and identity.

---

## 19. Clock/Time Manipulation Risks

### CURRENT IMPLEMENTATION

- All timestamps are local device time
- Subscription expiry check would use local clock if implemented
- No server-side timestamp validation

### REQUIRED BEHAVIOR

- Subscription expiry must be validated server-side
- Local clock tampering should not extend subscription
- `lastSubscriptionCheck` timestamp stored with server-provided time when online

### GAP

**MAJOR.** If subscription enforcement were implemented with local clocks, a user could manipulate system time to extend access.

### RISK

**Major.** Security-relevant if subscription model is ever enforced locally.

---

## 20. Error Handling When Internet Unavailable

### CURRENT IMPLEMENTATION

- App doesn't check internet at all
- Works fully offline with no degraded states or warnings

### REQUIRED BEHAVIOR

- First login: must require internet — clear error if unavailable
- Subsequent logins: can operate offline within entitlement window
- Clear UI indication of online/offline state

### GAP

**MAJOR.** App works fully offline on first run, defeating the "online-required first-run" rule.

### RISK

**Major.** Architecture rule violated silently.

---

## 21. Error Handling When Desktop Host Unavailable

### CURRENT IMPLEMENTATION

- `lan-client.ts` handles disconnection with exponential backoff reconnect
- `onConnectionChange` callback exists but may not be wired to UI
- No "Host unavailable" indicator in the mobile UI

### REQUIRED BEHAVIOR

- Clear UI indicator: "Host unavailable — offline sales enabled"
- POS continues to work offline when host is down

### GAP

**MODERATE.** Reconnection logic exists but UI may not reflect host state.

### FILES INVOLVED

- `src/hooks/useLanSync.ts` — needs to expose host availability
- `app/(tabs)/sell.tsx` — needs to show offline mode indicator

### RISK

**Moderate.** User doesn't know host status.

---

## 22. Error Handling When Cloud Unavailable

### CURRENT IMPLEMENTATION

**Not applicable.** Cloud is never contacted.

### REQUIRED BEHAVIOR

- After first-run: cloud unavailable is normal (LAN works)
- Subscription check failures: show warning, don't lock unexpectedly
- Cloud sync failures: queue events for retry

### GAP

**LOW** — because cloud is never contacted yet.

### RISK

**Low** for now, but will become critical when cloud sync is added.

---

## 23. Duplicate Events/Idempotency

### CURRENT IMPLEMENTATION

- Sequence numbers tracked via `lastSequenceNumber`
- Events applied in order via `Math.max` comparison
- No explicit deduplication — if the same event arrives twice, it might be applied twice

### REQUIRED BEHAVIOR

- Every event should be idempotent (applying twice has no extra effect)
- SALE_CONFIRMED should check `status !== 'confirmed'` before applying
- Sequence number should be the ultimate ordering guarantee

### GAP

**LOW.** The current implementation mostly handles this, but explicit idempotency checks would be safer.

### FILES INVOLVED

- `src/services/lan-client.ts` — `applySaleConfirmed`, `applySaleRejected`

### RISK

**Low** but could cause double-deduction of stock in edge cases.

---

## 24. Conflict Resolution

### CURRENT IMPLEMENTATION

- `sync_conflicts` table created
- `SALE_RECONCILIATION_REQUIRED` event defined in protocol
- `lan-client.ts` receives it in `handleEvent()` but has no handler — falls through silently
- `approvals.tsx` exists but only handles **device pairing approvals**, not **sale conflicts**

### REQUIRED BEHAVIOR

- `SALE_RECONCILIATION_REQUIRED` surfaced to manager/owner in a dedicated UI
- Options: Partial Fulfill / Cancel Sale / Escalate
- Resolution recorded in `sync_conflicts` and synced to cloud
- Customer never receives goods without explicit resolution

### GAP

**MAJOR.** Conflict event is received but not displayed or acted upon. Silent failure.

### FILES INVOLVED

- `src/services/lan-client.ts` — `handleEvent()` missing `SALE_RECONCILIATION_REQUIRED` case
- `app/(tabs)/approvals.tsx` — needs conflict resolution panel

### RISK

**Major.** Offline conflict sales are not handled. Customer could leave with goods and the sale is never resolved.

---

## 25. Database Migrations

### CURRENT IMPLEMENTATION

- `db-schema.ts` uses `CREATE TABLE IF NOT EXISTS` for all new tables
- `db.ts` uses `addColumnIfNotExists` for forward-only migrations
- No `schema_version` table
- No rollback mechanism

### REQUIRED BEHAVIOR

- `schema_versions` table tracking current version
- Migrations run in order on app startup
- Upgrades are forward-only (no rollback needed for this app)
- Seed data idempotent

### GAP

**LOW during development, HIGH for production.** Currently fine for development. For a production POS with real data, versioned migrations are important.

### FILES INVOLVED

- `src/lib/db-schema.ts`
- `src/lib/db.ts`

### RISK

**Low** for now, high if this reaches production with real shops.

---

## 26. Sensitive Data Stored Locally

### CURRENT IMPLEMENTATION

- `pin_hash` and `pin_salt` stored in local SQLite `employees` table
- `employeeId`, `role` stored in plain AsyncStorage
- `deviceId` stored in plain AsyncStorage
- Server IP stored in plain AsyncStorage

### REQUIRED BEHAVIOR

- PIN hashes: acceptable locally (they're hashes, not reversible)
- Session tokens: should be stored securely or with appropriate protection
- Device identity: acceptable locally
- No plain-text secrets

### GAP

**LOW-MODERATE.** Storage is not encrypted at rest. On a stolen device, an attacker with SQLite access could read all data.

### FILES INVOLVED

- AsyncStorage throughout
- SQLite database file

### RISK

**Low-Moderate.** Physical device theft is the threat model. SQLite at rest is not encrypted by default in Expo.

---

## Summary Table

| # | Item | Current Status | Gap Severity |
|---|---|---|---|
| 1 | Authentication | Local only | **Critical** |
| 2 | First-run flow | Offline bypasses cloud | **Critical** |
| 3 | Local shop creation | Fully supported | **Critical** |
| 4 | Employee/invitation flow | LAN-only, no cloud | **Major** |
| 5 | Device identity | Weak randomness | **Major** |
| 6 | Device pairing | No auth token | **Major** |
| 7 | Subscription enforcement | Not implemented | **Critical** |
| 8 | Offline entitlement | Not implemented | **Critical** |
| 9 | 3-day online verification | Not implemented | **Critical** |
| 10 | LAN sync | Partial (missing heartbeat/conflict) | **Moderate** |
| 11 | Cloud sync readiness | No cloud sync | **Critical** |
| 12 | Data backup/restore | Not implemented | **Critical** |
| 13 | Sale sync | Bypasses inventory transactions | **Moderate** |
| 14 | Inventory sync | Updates stock_quantity not current_stock | **Moderate** |
| 15 | Customer sync | Not implemented | **Low** |
| 16 | Employee/permission sync | Local only | **Major** |
| 17 | Audit logs | Table exists, not populated | **Moderate** |
| 18 | Device replacement/recovery | Not implemented | **Critical** |
| 19 | Clock manipulation risk | Unprotected | **Major** |
| 20 | Error: internet unavailable | App works anyway | **Major** |
| 21 | Error: host unavailable | Reconnects but UI may not show | **Moderate** |
| 22 | Error: cloud unavailable | Never contacts cloud | **Low** |
| 23 | Duplicate events/idempotency | Mostly handled | **Low** |
| 24 | Conflict resolution | Event not displayed | **Major** |
| 25 | Database migrations | Forward-only | **Low** |
| 26 | Sensitive data stored locally | Plain storage | **Low-Moderate** |

---

## Critical Dependencies (Web/Cloud Side)

Before mobile can implement cloud sync, the following must be defined by the web/Instant DB team:

1. **User authentication** — how does a user log in to Instant DB?
2. **Shop entity** — what's the Instant DB schema for `shops`?
3. **Employee entity** — what's the Instant DB schema for `employees`?
4. **Invitation model** — how are invitation codes issued and validated?
5. **Subscription fields** — what does the entitlement object look like?
6. **Device registration** — how does a device register with the cloud?
7. **Sync endpoint** — what's the cloud sync API?
8. **Backup snapshot format** — what does a full shop snapshot look like for device recovery?

**Recommendation:** The mobile team needs a shared `sync-contract.md` or TypeScript interface document produced by the web team before cloud sync can be implemented.

---

## Recommended Implementation Order

Given the dependencies above, here's what can be done now vs. what must wait:

### Can Do Now (No Cloud Contract Needed)

1. **Fix `applySaleConfirmed`** — use `recordInventoryTransaction` instead of raw SQL
2. **Wire `HOST_HEARTBEAT`** — add to `handleEvent()` in `lan-client.ts`, add to `useLanSync` hook
3. **Add `SALE_RECONCILIATION_REQUIRED` to `handleEvent()`** — surface in `approvals.tsx`
4. **Add audit log writes** — `createEmployee`, `adjustStock`, `createSale` should call `writeAuditLog`
5. **Remove weak PIN fallback** — delete `|| newPin === '0000'` from auth.tsx
6. **Upgrade device identity** — use `crypto.getRandomValues` instead of `generateId()`

### Must Wait for Cloud Contract

7. **Rewrite `welcome.tsx`** — online-first login flow (depends on auth API)
8. **Rewrite `auth.tsx`** — cloud authentication (depends on auth API)
9. **Subscription enforcement** — (depends on subscription API)
10. **Cloud sync worker** — (depends on sync REST API)
11. **Device recovery** — (depends on snapshot API)

---

## What NOT To Do

- **Do not add branches** — not required by current business model
- **Do not implement local shop creation** — it contradicts the architecture
- **Do not guess the Instant DB schema** — wait for the web team to define it
- **Do not add more POS features** — the foundation must be corrected first
