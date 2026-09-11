# Phase 18 Brief — soostori-mobile

**Phase:** 18 | **Repo:** `soostori-mobile` | **Date:** 2026-09-11
**Theme:** M-Pesa STK Push, Audit Trail, Subscription Enforcement UX, SDK Auth对齐

---

## Context

Mobile is a fully offline-first Expo/React Native POS app. Phase 17 added the notifications layer (Expo Push + SQLite store + deep linking + sync-timer notification dispatch). Phase 16 wired offline-first sync (outbox + dead-letter + background push). Phase 15 added device management + Primary Device coordinator. Phase 14 added team management.

Phase 18 closes four gaps:

1. **M-Pesa STK Push** — Mobile already has `mpesa-service.ts` with a mock implementation + TODO comments. Real PayHero API integration must replace the mock.
2. **Audit Trail** — Mobile writes notifications to SQLite but has no structured `audit_logs` table; the SDK event bus exists but audit records are not persisted locally.
3. **Subscription Enforcement UX** — Mobile enforces subscription gate at the service layer (`db-subscription-gate.ts`) but gives poor UX when blocked — should show a dedicated screen, not just a toast.
4. **SDK Auth对齐** — The `useAuthSdk` hook and `OperationalAuth` integration are in place but the enrollment flow has edge cases around `DeviceEnrollmentState` that cause infinite loops or silent failures.

---

## 1. M-Pesa STK Push — Replace Mock with Real PayHero API

### What Exists
- `src/services/mpesa-service.ts` — `requestStkPush()`, `queryStkStatus()`, `validateMpesaReceipt()` with mock implementations and `TODO` comments for the real Safaricom API
- `app/(tabs)/pos.tsx` — POS checkout flow already calls `requestStkPush()` → `queryStkStatus()` polling
- The `mpesa-service.ts` is wired into `pos-checkout-modal.tsx`

### What Must Be Built

**Replace `src/services/mpesa-service.ts`** with real PayHero implementation:

```typescript
// PayHero API base
const PAYHERO_BASE = 'https://payhero.io/api'

interface STKPushRequest {
  phone: string        // 254...
  amount: number        // KES
  accountReference: string  // shopId or sale reference
  transactionDesc: string
}

interface STKPushResponse {
  checkoutRequestId: string
  merchantRequestId: string
}

interface STKStatusResponse {
  status: 'pending' | 'completed' | 'failed' | 'timeout'
  receiptNumber?: string
  amount?: number
  errorMessage?: string
}
```

**`requestStkPush(params: STKPushRequest)`**:
- POST to `https://payhero.io/api/payment`
- Headers: `Authorization: Bearer ${PAYYAHERO_API_KEY}`
- Body: `{ phone, amount: params.amount, account_reference: params.accountReference, transaction_description: params.transactionDesc }`
- Returns `{ checkoutRequestId }` from response body
- Store `checkoutRequestId → { phone, amount, status: 'pending', createdAt }` in `stk_push_state` SQLite table (create if not exists)

**`queryStkStatus(checkoutRequestId: string)`**:
- GET from `https://payhero.io/api/payment/${checkoutRequestId}` with Bearer token
- OR: maintain a `stk_push_state` table updated by the PayHero callback webhook
- Poll every 3 seconds, max 20 attempts (60s total timeout)
- Returns `'pending' | 'completed' | 'failed' | 'timeout'`

**PayHero callback webhook** (`app/api/mpesa/callback/route.ts` via expo-router):
- GET: verify `query.token === PAYHERO_WEBHOOK_TOKEN`
- POST: receive callback JSON → parse `CheckoutRequestID`, `ResultCode` (0 = success)
  - Update `stk_push_state` row: `status = 'completed'`, `receipt_number`, `completed_at`
  - Return HTTP 200 immediately (PayHero requires fast acknowledgment)

**SQLite table** `stk_push_state`:
```sql
CREATE TABLE IF NOT EXISTS stk_push_state (
  id TEXT PRIMARY KEY,
  checkout_request_id TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  receipt_number TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);
```

**UI flow in `pos-checkout-modal.tsx`** (or `sell.tsx`):
1. User selects M-Pesa payment → phone input shown (pre-filled from customer phone or shop default)
2. "Send Payment Request" button → `requestStkPush(phone, total)`
3. Show spinner + "Waiting for payment..." + cancel button
4. Poll `queryStkStatus` every 3 seconds
5. On `'completed'`: auto-confirm sale, show success screen
6. On `'failed'/'timeout'`: show error + "Try Again" or "Manual Confirm" button

**Environment** (in `app.json` extra or `.env` via ` expo-build-properties`):
```
PAYYAHERO_API_KEY=...
PAYYAHERO_WEBHOOK_TOKEN=...
```

---

## 2. Audit Trail — Local SQLite Audit Log

### What Exists
- `src/services/sdk-bridge/sdk-event-bus.ts` publishes canonical `SoostoriEvent` for every mutation
- `src/services/sdk-bridge/sdk-audit-storage.ts` — `MobileAuditStorage` implements SDK `AuditStorage` and writes to `audit_logs` table
- But: `audit_logs` table may not exist in the mobile schema, or the audit service may not be wired

### What Must Be Built

**Check `src/lib/db-schema.ts`** — verify `audit_logs` table exists:
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  actor_type TEXT NOT NULL,  -- 'employee' | 'system' | 'cloud'
  actor_id TEXT,
  shop_id TEXT,
  entity_kind TEXT,
  entity_id TEXT,
  metadata TEXT,  -- JSON
  created_at TEXT NOT NULL
);
```

**If missing**: add to schema migrations in `src/lib/db.ts`:
```typescript
// Migration v5: add audit_logs table
if (version < 5) {
  await db.executeAsync(sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      event_name TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      shop_id TEXT,
      entity_kind TEXT,
      entity_id TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL
    );
  `);
  version = 5;
}
```

**Wire `MobileAuditStorage`** into `bootstrap.ts`:
- Verify `attachSdkAuditRecorder()` is called in `app/_layout.tsx` after DB init
- If `sdk-audit-storage.ts` doesn't exist or isn't wired, create and wire it

**`src/services/sdk-bridge/sdk-audit-storage.ts`**:
```typescript
import { getDb } from '../../lib/db'

export class MobileAuditStorage implements AuditStorage {
  async saveAuditEvent(event: AuditEvent): Promise<void> {
    const db = getDb()
    const { v4: uuid } = await import('uuid')
    await db.runAsync(
      `INSERT INTO audit_logs (id, event_id, event_name, actor_type, actor_id, shop_id, entity_kind, entity_id, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuid(), event.eventId, event.eventName, event.actorType, event.actorId ?? null,
       event.shopId ?? null, event.entityKind ?? null, event.entityId ?? null,
       JSON.stringify(event.metadata ?? {}), new Date().toISOString()]
    )
  }

  async listAuditEvents(filter: { shopId?: string; entityKind?: string; from?: string }): Promise<AuditEvent[]> {
    // For future audit log viewer (not in Phase 18 scope)
    return []
  }
}
```

**Wire it** in `src/services/sdk-bridge/bootstrap.ts`:
```typescript
import { MobileAuditStorage } from './sdk-audit-storage'
import { attachSdkAuditRecorder } from '@soostori/audit'

const auditStorage = new MobileAuditStorage()
attachSdkAuditRecorder(auditStorage)
```

---

## 3. Subscription Blocked UX — Dedicated Screen

### What Exists
- `db-subscription-gate.ts` throws `SubscriptionBlockedError` when subscription is blocked
- The error propagates but there is no dedicated UI for it — just a generic toast or silent fail

### What Must Be Built

**Create `app/subscription-blocked.tsx`**:
- Full-screen blocked state with:
  - Soostori logo/icon
  - Title: "Subscription Expired"
  - Body: "Your Soostori subscription has expired. Contact Soostori to renew and restore full access."
  - Phone/contact button: `Linking.openURL('tel:+254732203353')`
  - "Retry" button to re-check subscription status
- No POS, inventory, or reports access while blocked

**Wire in `app/_layout.tsx`**:
- After DB init + auth check → check subscription status from `app_settings.subscription_status`
- If `'blocked'`, render `<SubscriptionBlocked />` instead of normal app layout
- On mount: attempt one cloud sync to refresh subscription state before showing blocked screen

**`src/services/db-subscription-gate.ts`**:
- After throwing `SubscriptionBlockedError`, trigger a cloud sync to refresh subscription state
- Ensure the error includes `plan`, `expiresAt` for the blocked screen to display

**`src/services/cloud-sync-service.ts`**:
- `pullAndApply()` → after pulling, query subscription entity from FIDScript
- Update `app_settings.subscription_status`, `subscription_plan`, `subscription_expires_at`
- If status changed to `'blocked'`, persist immediately

---

## 4. SDK Auth Enrollment Edge Cases

### What Exists
- `src/hooks/useAuthSdk.ts` — handles Google Sign-In → `DeviceEnrollmentState` detection → PIN setup/verify
- `src/services/sdk-adapter.ts` — `rnPlatformAdapter` (CloudAuth) + `rnOperationalPlatformAdapter`
- `src/services/cloud-auth-backend.ts` — `cloudVerifyMagicCode`, `cloudExchangeGoogleToken`
- `app/auth.tsx` — step-based UI: select → enrollment → pin_setup/pin_verify

### What Must Be Built

**Fix `DeviceEnrollmentState` transitions** — the current flow can loop or stall when:
1. Device has no `cloudId` on the FIDScript `employees` table (first login)
2. `devices.hasPin` field is `MISSING` from FIDScript schema (known blocker from SDK Phase 17)
3. Network failure during PIN setup

**`src/hooks/useAuthSdk.ts`** improvements:
```typescript
// When DeviceEnrollmentState is:
// PIN_SETUP_REQUIRED → call setupPin()
// PIN_VERIFICATION_REQUIRED → call verifyPin()
// DEVICE_NOT_ENROLLED → must call cloudEnrollDevice() first
//   → after enrollment, re-check state

// Add timeout for PIN setup (30s) — if cloud response takes too long, show retry
// Add explicit error states for:
//   - 'network_error' → "Check your internet and try again"
//   - 'enrollment_failed' → "Could not enroll device. Contact admin."
//   - 'pin_setup_failed' → "PIN setup failed. Try again."
```

**Fix `cloud-auth-device.ts`**:
- Device registration (`registerDevice()`) should use the correct FIDScript transact pattern
- When `devices.hasPin` is not yet in the schema (known gap), store `hasPin: false` locally and handle gracefully

**Fix magic code flow**:
- `cloudVerifyMagicCode` should return `enrollmentState: 'new_device' | 'existing_device'` to help UI decide next step
- After successful magic code auth, if `employee.cloudId` is null (first login), trigger device enrollment before showing PIN screen

**Test all 4 `DeviceEnrollmentState` paths**:
1. New device, new employee → enrollment → PIN setup → operational
2. Existing device, existing employee, no PIN → PIN setup → operational
3. Existing device, existing employee, PIN set → PIN verify → operational
4. Network failure at any step → error screen with retry

---

## Cross-Cutting Requirements

### ANPAS Compliance
- All new files ≤ 150 lines
- Follow `[domain]-[action]-type.ts` naming
- No business logic in React Native components
- Every new/modified file updates `CHANGELOG.md`
- Run `npx tsc --noEmit` before declaring done

### Forbidden Patterns
- No `helpers.ts`, `common.ts`, `utils.ts`
- No `any` without documented exception
- No native `Alert.alert()` for non-critical UX (use toast/snackbar)
- No AI visual vocabulary

### Files to Modify / Create
| File | Action |
|------|--------|
| `src/services/mpesa-service.ts` | REWRITE — real PayHero API |
| `app/api/mpesa/callback/route.ts` | CREATE — PayHero webhook |
| `src/lib/db.ts` | MODIFY — add `stk_push_state` table migration v5 |
| `src/services/sdk-bridge/sdk-audit-storage.ts` | CREATE / AUDIT — verify MobileAuditStorage |
| `src/services/sdk-bridge/bootstrap.ts` | MODIFY — attach audit recorder |
| `app/subscription-blocked.tsx` | CREATE — blocked UX screen |
| `app/_layout.tsx` | MODIFY — mount subscription blocked gate |
| `src/hooks/useAuthSdk.ts` | IMPROVE — enrollment edge cases |
| `src/services/cloud-auth-backend.ts` | IMPROVE — enrollment state detection |
| `src/services/cloud-auth-device.ts` | IMPROVE — device enrollment robustness |
| `CHANGELOG.md` | UPDATE |
| `.ai/review-checklist.md` | UPDATE if needed |

### Environment / Secrets
```
PAYYAHERO_API_KEY=...        # Add to app.json extra or use Constants.expoConfig
PAYYAHERO_WEBHOOK_TOKEN=...  # Shared secret for PayHero → app callback
```

---

## Delivered vs. Planned (Agent Report)

**Status:** Phase 18 worktree ready — needs commit + `tsc --noEmit` verification.

### ✅ Delivered
| Item | Status | Notes |
|------|--------|-------|
| M-Pesa STK Push | ✅ | `mpesa-service.ts` rewritten (PayHero API + offline UUID fallback + stk_push_state SQLite table) |
| Audit Trail | ✅ | Migration V5 in `db.ts` (stk_push_state + audit_logs columns); `MobileAuditStorage` wiring verified correct |
| Subscription Blocked UX | ✅ | `app/subscription-blocked.tsx` (130L); `root-layout-content.tsx` adds 'blocked' auth state + revalidation on boot |
| SDK Auth Edge Cases | ✅ | `useAuthSdk.ts` refactored (319L → split needed); `cloud-auth-backend.ts` returns `enrollmentState`; `cloud-auth-device.ts` gets `getLocalHasPin/setLocalHasPin` |
| `CHANGELOG.md` | ✅ | Updated |

### ⚠️ Over-Cap Files — Must Split Before Commit
| File | Lines | Limit | Action |
|------|-------|-------|--------|
| `src/hooks/useAuthSdk.ts` | **664** | 150 | Split into: `useAuthSdk.ts` (hook shell + state machine) + `auth-cloud-flow.ts` (cloud auth methods) + `auth-pin-flow.ts` (PIN setup/verify) + `auth-device-enrollment.ts` (enrollment state detection) |
| `src/services/mpesa-service.ts` | **212** | 150 | Split into: `mpesa-service.ts` (public API) + `mpesa-payhero-client.ts` (PayHero HTTP calls) + `mpesa-stk-types.ts` (types) |
| `app/subscription-blocked.tsx` | **130** | 150 | ✅ Under limit — no action needed |

### 📋 Diff from Brief
- **PayHero callback webhook:** Agent chose to use `stk_push_state` SQLite table (updated by webhook) instead of polling the PayHero API directly. This is a better design — webhook updates local DB, UI polls local DB. Confirmed in `mpesa-service.ts`.
- **`useAuthSdk.ts` refactor:** The hook was heavily refactored. `withTimeout()` wrapper on all async ops. Three explicit error codes: `NETWORK_ERROR`, `ENROLLMENT_FAILED`, `PIN_SETUP_FAILED`. `determineEnrollmentState()` uses `SecureStore.hasPin`. — Correct implementation.
- **Commission Sync:** Not in Mobile brief originally. Mobile does NOT show commission data (that is a Web/Salesperson portal feature). No gap.
- **App-level changes:** `pos-checkout-modal.tsx` and `pos-checkout-payment-selector.tsx` modified to call the new `mpesa-service.ts` API.

---

## Verification Checklist

- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] `useAuthSdk.ts` split to ≤ 150 lines per module
- [ ] `mpesa-service.ts` split to ≤ 150 lines per module
- [ ] M-Pesa: select M-Pesa → enter phone → click Send → spinner shows → poll completes → sale confirmed or error shown
- [ ] M-Pesa fallback: if STK times out, "Manual Confirm" button allows cashier to proceed
- [ ] Audit: after a sale, `SELECT * FROM audit_logs` has a new row
- [ ] Subscription blocked: setting `subscription_status = 'blocked'` shows full-blocked screen with contact button
- [ ] Auth: new device completes full flow (enroll → PIN setup → operational) without looping
- [ ] All remaining files ≤ 150 lines (verify with `wc -l`)
- [ ] `CHANGELOG.md` committed
