# Phase 2 — Mobile Platform: Business & Account Provisioning Audit Prompt

**Phase:** 2 of 27
**Platform:** Mobile (`Documents/GitHub/soostori-mobile`)
**Goal:** Audit how Mobile handles business/account provisioning with the SDK, fix gaps, commit, push.

---

## Prerequisites

Before making any changes, read:
- `CLAUDE.md`
- `.claude/CLAUDE.md`
- `.ai/coding-rules.md`

Also read the Phase 2 SDK acceptance record:
- `../../soostori-sdk/docs/PHASE-02-BUSINESS-ACCEPTANCE.md`

---

## Context: What the SDK Published for Phase 2

**SDK packages:**
- `@soostori/business@0.1.0-alpha.2`
- `@soostori/team@0.1.0-alpha.3`
- `@soostori/subscription@0.1.0-alpha.2`
- `@soostori/devices@0.1.0-alpha.2`
- `@soostori/cloud@0.1.0-alpha.5`
- `@soostori/events@0.1.0-alpha.2`

**SDK provides:**
- `BusinessService.createBusiness()` — creates business + owner membership
- `BusinessRepository` — Person, Business, Membership, Device, Subscription entities
- `TeamService.inviteMember()` — sends invitation (idempotent)
- `TeamService.acceptInvitation()` — accepts invitation
- `DeviceService.registerDevice()` — registers device with subscription limit enforcement
- `DeviceLimitExceededError`
- `setActiveBusiness()` / `getActiveBusiness()` — business switching
- Event types: `EMPLOYEE_INVITED`, `EMPLOYEE_ACCEPTED`, `EMPLOYEE_ROLE_CHANGED`, `EMPLOYEE_REVOKED`
- Offline grace period: 3 days

**Mobile context:** Mobile is a POS app — it operates within a single business at a time. Business switching is for the device owner who may manage multiple shops.

---

## Audit Questions

### 1. Package Versions

- What version of `@soostori/business` is Mobile currently using?
- Is it `^0.1.0-alpha.2`? Update if not.
- Check `@soostori/team`, `@soostori/subscription`, `@soostori/devices` too.

### 2. SDK Package Usage

- Does Mobile import from `@soostori/business`, `@soostori/team`, `@soostori/devices`?
- List all `@soostori/*` imports and what they are used for.

### 3. Business Context

- Does Mobile have a concept of the "active business"?
- Is `getActiveBusiness()` used?
- Where is the active business stored? (SQLite? State?)

### 4. Device Registration

- Does Mobile register the device on first launch?
- Does it use `DeviceService.registerDevice()`?
- Does it handle `DeviceLimitExceededError`?
- Is the device linked to the correct business/shop?

### 5. Membership and Role

- Does Mobile know the current user's role?
- Is the role used to enable/disable features?
- Are Owner, Manager, Cashier, Attendant roles handled?

### 6. Business Switching

- Can the device owner switch between multiple businesses?
- Does `setActiveBusiness()` work on Mobile?
- Is all local data correctly isolated per business?

### 7. Invitations (for device owner flow)

- Can a manager/owner send invitations from Mobile?
- Does it use `TeamService.inviteMember()`?

### 8. Offline Business Operations

- Can Mobile create businesses offline?
- Is the business creation queued in the sync queue?
- Does the sync queue handle business entity creation?

### 9. Subscription Awareness

- Does Mobile check if the subscription is active?
- Does it respect the offline grace period?

---

## Gap Analysis

For each area above, mark: **Verified** | **Gap** | **N/A**

List every gap with: file, line, issue, correct behavior.

---

## Fix

Fix all gaps. Rules:
- Use the SDK as the single source of truth
- Follow ANPAS: 150-line cap, feature folders, CHANGELOG per commit
- Do not invent parallel business logic

---

## Commit and Push

Commit with a descriptive message and push.

---

## Output

Report: package versions, gaps found/fixed, commit SHA, push status.
