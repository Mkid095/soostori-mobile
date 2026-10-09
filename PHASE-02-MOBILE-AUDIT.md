# PHASE 2 — BUSINESS & ACCOUNT PROVISIONING
## Application Brief — Mobile
**For**: Mobile agent
**Status**: 🔵 START
**SDK acceptance**: `PHASE-02-BUSINESS-ACCEPTANCE.md` (SDK commit `656f599`)

---

## SDK packages updated

| Package | New Version | Action |
|---------|-------------|--------|
| `@soostori/business` | `^0.1.0-alpha.2` | Update |
| `@soostori/team` | `^0.1.0-alpha.3` | Update |
| `@soostori/subscription` | `^0.1.0-alpha.2` | Update |
| `@soostori/devices` | `^0.1.0-alpha.2` | Update |
| `@soostori/cloud` | `^0.1.0-alpha.5` | Update |
| `@soostori/events` | `^0.1.0-alpha.2` | Update |

---

## PART A — SDK VERSION UPDATE

In `package.json`, update all these to the new versions above, then run `pnpm install`.

---

## PART B — MOBILE-SPECIFIC AUDIT

### B1 — Verify CloudClient provisioning methods

**Read**: `src/services/cloud-auth-backend.ts`, `src/services/cloud-business-setup.ts`

Mobile must use `@soostori/cloud`'s `CloudClient` for provisioning operations. Verify:
- `cloudCreateShop()` — creates business in InstantDB
- `cloudCreateEmployee()` — creates employee/membership record
- `cloudCreateInvitation()` — sends invitation
- `cloudAcceptInvitation()` — accepts invitation atomically
- `cloudRegisterDevice()` — registers this device

If Mobile has custom InstantDB calls that duplicate these, audit whether they match the SDK contract.

### B2 — Business creation flow

**Read**: `src/services/cloud-business-setup.ts`

After Phase 1 auth, Mobile must:
1. Allow user to create a business (name, slug, tax rate, currency)
2. Create owner employee record with role `owner`
3. Bootstrap subscription
4. Register this device

Verify the onboarding flow uses the SDK's `BusinessService` or equivalent InstantDB calls.

### B3 — Invitation flow

**Read**: `src/hooks/` — find invitation/team hooks

Mobile must implement:
- View pending invitations
- Accept invitation → `cloudAcceptInvitation()` → employee record created
- See team members and roles

Audit whether these hooks use the new SDK methods.

### B4 — Business switching

Mobile supports multiple businesses per account. Verify:
- User can switch between businesses
- Active business is stored and used for all subsequent operations
- `setActiveBusiness()` / `getActiveBusiness()` from SDK or equivalent

### B5 — Subscription enforcement

**Read**: `src/services/cloud-auth-backend.ts` — `resolveSubscription()`

Verify:
- Subscription entitlement checked on each cloud sync
- `DeviceLimitExceededError` caught and surfaced to user
- Offline grace period enforced (3 days)

### B6 — Role-based UI

**Read**: components that check `employee.role`

Verify UI hides/shows features based on role (`owner`, `manager`, `cashier`, `attendant`, `viewer`).

---

## PART C — COMMIT AND PUSH

```bash
git add .
git commit -m "fix(business): update @soostori packages to alpha.2+, audit business provisioning flows"
git push origin master
```

---

## OUTPUT

Produce `PHASE-02-MOBILE-AUDIT-REPORT.md` in the Mobile root.
