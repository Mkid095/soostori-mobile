# PHASE 1 — MOBILE AUTHENTICATION AUDIT
## Application Brief — Mobile
**For**: Mobile agent
**Status**: 🔵 AUDIT IN PROGRESS
**Based on**: PHASE-01-SDK-AUDIT-REPORT.md (SDK agent, commit dc8c7f7)

---

## Context

The SDK agent has completed Phase 1 fixes. `@soostori/auth@0.1.0-alpha.7` is published.

**What changed in the SDK**:
- `StoredSession` now correctly populated with `employeeId`, `shopId`, `deviceId` from API responses (GAP-01/02/03 fixed)
- `beginEnrollment()` now returns `enrollmentToken` from `verifyPinForEnrollment()` to enable cross-device enrollment (GAP-04 fixed)
- 144/144 tests passing
- Web export verified sufficient (GAP-05 ✓, GAP-06 ✓)

**Mobile's current SDK version**: `^0.1.0-alpha.6` — update to `^0.1.0-alpha.7`

---

## PART A — SDK VERSION UPDATE

### A1 — Update `@soostori/auth` version

In `package.json`, update:

```diff
- "@soostori/auth": "^0.1.0-alpha.6",
+ "@soostori/auth": "^0.1.0-alpha.7",
```

Run `npm install` to update the lockfile.

---

## PART B — MOBILE-SPECIFIC AUDIT

### B1 — Verify SDK consumption vs. custom auth implementation

**CRITICAL AUDIT ITEM**

**Read**: `src/services/cloud-auth-backend.ts`, `src/hooks/auth-cloud-flow.ts`

The SDK audit found that Mobile has a custom `cloud-auth-backend.ts` implementing `cloudSendMagicCode` and `cloudVerifyMagicCode` using InstantDB directly, bypassing `@soostori/auth`'s `CloudAuth`.

**This must be resolved.**

Two options:

**Option A (preferred)**: Migrate Mobile to use `@soostori/auth`'s `CloudAuth`:
- `CloudAuth.signInWithGoogleIdToken({ idToken, clientName })` for Google sign-in
- Implement React Native platform adapter for `_saveStoredSession` / `_loadStoredSession` / `_clearStoredSession`
- `OperationalAuth` via `@soostori/auth` (RN export: `dist/pin-rn.js`)

**Option B**: If magic-code is a valid separate flow, it must be added to the SDK's `AuthApiClient` interface so all platforms share the same contract. Raise this as a gap.

Audit `src/hooks/auth-cloud-flow.ts` to determine which option applies.

### B2 — Verify Google ID token flow uses SDK

**Read**: `src/hooks/auth-cloud-flow.ts`

Mobile uses `GoogleSignin.signIn()` (React Native Google Sign-In) to get an ID token, then must call:

```typescript
cloudAuth.signInWithGoogleIdToken({ idToken, clientName })
```

Where `clientName` is the FIDScript app name registered with InstantDB.

Verify this is implemented. If Mobile uses a custom API call instead of `CloudAuth.signInWithGoogleIdToken()`, fix it.

### B3 — Verify StoredSession consumption

**Read**: `src/services/cloud-auth-backend.ts`

After the SDK fix (GAP-01/02/03), `StoredSession` now carries `employeeId`, `shopId`, `deviceId`.

Mobile must:
1. Load `StoredSession` from AsyncStorage on app startup via `restoreSession()`
2. Use `session.employeeId`, `session.shopId`, `session.deviceId` to populate the identity context
3. NOT create separate AsyncStorage keys for these values (they should come from `StoredSession`)

Audit: Does Mobile have duplicate storage for employeeId/shopId/deviceId? If so, consolidate to use `StoredSession`.

### B4 — Verify React Native OperationalAuth

**Read**: `src/hooks/auth-pin-flow.ts`, `src/services/cloud-auth-device.ts`

Mobile must NOT use `DesktopOperationalAuth`. It must use the React Native-specific PIN implementation from `@soostori/auth`:

```typescript
import { OperationalAuth } from '@soostori/auth'
// The react-native export maps to pin-rn.ts
```

Verify `src/hooks/auth-pin-flow.ts` uses the SDK's `OperationalAuth`, not a custom implementation.

### B5 — Verify PIN enrollment for first device

Verify the first-device PIN enrollment flow:
```
User authenticates (Google ID token)
  → User sets PIN
  → OperationalAuth.setupPin() stores verifier locally
  → Device record created in InstantDB with hasPin=true
```

### B6 — Verify cross-device enrollment flow

**Read**: `src/hooks/auth-device-enrollment.ts`

After GAP-04 fix, `beginEnrollment()` returns `enrollmentToken`. Verify the Mobile flow:
1. New device calls `getEnrollmentState()` → `PIN_VERIFICATION_REQUIRED`
2. User enters PIN from existing device
3. `beginEnrollment()` called with `pinVerificationProof` → returns `enrollmentToken`
4. `completeEnrollmentWithCloudVerify()` called with `enrollmentToken`, `newPinVerifier`, `newPinSalt`
5. Device enrolled

Verify `src/hooks/auth-device-enrollment.ts` implements steps 3-4 using the new `enrollmentToken` return value.

### B7 — Verify identity chain after sign-in

**Read**: `src/services/cloud-auth-employee.ts`, `src/services/cloud-auth-device.ts`

After `signInWithGoogleIdToken` succeeds, Mobile must:
1. `resolveOrCreateEmployee()` — ensure employee record exists in InstantDB
2. `resolveOrRegisterDevice()` — ensure device record exists in InstantDB

Verify both are called after successful authentication.

### B8 — Verify subscription resolution

**Read**: `src/services/cloud-auth-backend.ts` — `resolveSubscription()`

After sign-in, Mobile must resolve the shop's subscription to gate device enrollment. Verify this is called and the result is cached.

---

## PART C — TEST REQUIREMENT

After changes, run:

```bash
npx vitest run src/services/adapters/auth/__tests__/
npx vitest run src/services/__tests__/
```

All tests must pass. If tests fail, fix the implementation — do not skip or delete tests.

---

## PART D — COMMIT AND PUSH

```bash
# 1. Update CHANGELOG.md

# 2. npm install (if package.json changed)

# 3. Commit
git add .
git commit -m "fix(auth): update @soostori/auth to ^0.1.0-alpha.7, migrate to SDK CloudAuth,
         verify StoredSession consumption, audit cross-device enrollment"

# 4. Push
git push origin main
```

---

## OUTPUT

Produce `PHASE-01-MOBILE-AUDIT-REPORT.md` in the Mobile root containing:
- Which items were verified correct
- Which items were fixed
- Any new gaps found
- Decision on B1 (Option A or Option B)
- Git commit SHA
- Test results
