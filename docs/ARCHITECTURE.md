# Soostori Architecture v4 — Mobile-First, Cloud-Integrated POS

**Status:** Active Architecture
**Date:** 2026-08-30
**Supersedes:** All prior architecture documents

---

## Core Principle

> **"Your business should run from your phone. A computer is an option, not a requirement."**

Soostori is designed as a cloud-integrated, offline-first POS platform that works whether or not the shop has a desktop computer. The desktop is a **preferred operational host** when present, but is **never mandatory**.

---

## System Topology

```
                         INSTANT DB CLOUD
                           /    |    \
                          /     |     \
                       WEB    MOBILE   DESKTOP
                                ↕        ↕
                                └──LAN───┘
                                  optional
```

**Key principle:** Neither Mobile nor Desktop is a mandatory gateway to the cloud. Both connect independently to Instant DB. Mobile can operate a full shop without Desktop. Desktop, when present, is an optional local authority.

---

## Three Operating Modes

### Mode A — Mobile-Only Shop (No Desktop)

```
Owner phone (authenticated)
     │
     │ creates local Wi-Fi hotspot
     │
  ┌──┴──┐
  │      │
 📱      📱
Owner  Cashier
```

- Owner creates shop and authenticates via cloud on first run
- Phones synchronize over local Wi-Fi (no internet required for sales)
- Internet returns → cloud sync happens
- No PC required at any point

### Mode B — Mobile + Desktop

```
              Cloud
               │
           Desktop
        (Local Authority)
             │
          Wi-Fi/LAN
          ↙       ↘
       📱         📱
      Owner      Cashier
```

- Desktop is the local operational authority
- Mobile devices connect to desktop over LAN
- Cloud handles identity, subscription, backup
- Desktop handles real-time POS synchronization

### Mode C — Desktop-Centric (Legacy/Enterprise)

```
Cloud
  │
Desktop (permanent host)
  │
LAN
  │
Multiple POS stations
```

- Traditional multi-terminal setup
- Desktop always-on as stable local server
- Cloud backup and remote management

---

## Two Synchronization Layers

### Layer 1 — Cloud Sync (HTTPS/Internet)

**Always available when internet exists. Queued and retried when unavailable.**

```
Mobile/Desktop
     │
     │ HTTPS
     ▼
Soostori Cloud API
     │
     ▼
Instant DB
```

Used for:
- Account authentication
- Subscription entitlement
- Shop/employee/device registration
- Incremental event backup
- Cross-device state
- Owner visibility/reporting
- Device recovery snapshots

### Layer 2 — Local LAN Sync (Wi-Fi/WebSocket)

**Works without internet. Requires devices to be on same Wi-Fi network.**

```
Device A ←→ Device B
  ↕           ↕
Device C ←→ Device D
```

Used for:
- Real-time stock updates
- Sale confirmation/rejection
- Device pairing/approval
- Host heartbeat monitoring
- Conflict detection
- Fast local synchronization

**Important:** Wi-Fi does not require internet. A shop's Wi-Fi router can provide local connectivity while internet is down.

---

## Soostori Sync Engine

One synchronization engine across all three layers:

```
                    SOOSTORI SYNC ENGINE
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
       Cloud Sync        Local LAN        Desktop Host
          │                 │                 │
       Internet          Wi-Fi/LAN         Local API
          │                 │                 │
          ▼                 ▼                 ▼
       Instant DB      Shop Devices     SQLite (authoritative)
```

Events are generated uniformly:
```
SALE_CREATED
STOCK_ADJUSTED
PRODUCT_UPDATED
EMPLOYEE_CREATED
DEVICE_REGISTERED
...
```

The sync engine routes events to the appropriate destination(s) based on:
- Device connectivity state
- Event type
- Authority rules

---

## Cloud Contract (Phase 0)

Before implementing cloud integration, define the contract in:
- `docs/sync-contract.md`
- `src/contracts/cloud.ts`

### Core Cloud Entities

```typescript
// User — cloud account owner
interface User {
  id: string
  email: string
  phone?: string
  createdAt: string
}

// Shop — cloud shop identity
interface Shop {
  id: string          // Cloud ID
  name: string
  ownerId: string    // User who owns this shop
  createdAt: string
  updatedAt: string
}

// Employee — cloud employee record
interface Employee {
  id: string          // Cloud ID
  shopId: string
  name: string
  email?: string
  phone?: string
  role: 'owner' | 'manager' | 'attendant'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Device — cloud device registration
interface Device {
  id: string          // Cloud device ID
  shopId: string
  employeeId?: string
  deviceName?: string
  deviceType: 'mobile' | 'desktop'
  status: 'registered' | 'authorized' | 'revoked'
  lastSeen?: string
  createdAt: string
}

// Invitation — cloud-issued invitation
interface Invitation {
  id: string
  shopId: string
  employeeId: string
  code: string        // 6-digit code
  expiresAt: string
  usedAt?: string
  createdAt: string
}

// SubscriptionEntitlement — subscription state from cloud
interface SubscriptionEntitlement {
  shopId: string
  status: 'active' | 'past_due' | 'expired' | 'cancelled'
  plan: string
  expiresAt: string
  verifiedAt: string   // Last online verification timestamp
  serverTime: string   // Server-authoritative timestamp
  nextVerificationDeadline: string
}

// SyncEvent — cloud sync record
interface CloudSyncEvent {
  id: string
  shopId: string
  deviceId: string
  sequenceNumber: number
  type: string
  entityId: string
  timestamp: string
  payload: unknown
}

// CloudSnapshot — full shop snapshot for device recovery
interface CloudSnapshot {
  shopId: string
  version: number
  exportedAt: string
  shop: Shop
  employees: Employee[]
  products: Product[]
  customers: Customer[]
  settings: ShopSettings
  // ... all shop data
}

// SyncCursor — position marker for incremental sync
interface SyncCursor {
  shopId: string
  deviceId: string
  lastSequenceNumber: number
  lastSyncedAt: string
}
```

### Cloud API Endpoints (Conceptual)

```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/shop/:shopId
POST   /api/shop/create
GET    /api/employees?shopId=
POST   /api/devices/register
POST   /api/devices/authorize
GET    /api/invitations?shopId=
POST   /api/invitations/create
GET    /api/subscription/:shopId
GET    /api/sync/events?since=:sequence
POST   /api/sync/events
GET    /api/snapshot/:shopId
POST   /api/snapshot/restore
GET    /api/server-time
```

---

## Authentication Flow

### Owner First Run (Mobile or Web)

```
Owner opens Soostori app
         ↓
    [ Get Started ]
         ↓
Soostori Cloud (Internet)
         ↓
Authenticate / Register account
         ↓
Check subscription (or start trial)
         ↓
Create shop OR Join existing shop
         ↓
Device registered with cloud
         ↓
Initial snapshot downloaded
         ↓
Local SQLite initialized
         ↓
MOBILE OPERATIONAL
```

**No desktop required.** Owner can create a shop and run a full business from a single phone.

### Employee Onboarding

```
Owner (from their phone or web):
  Team → Add Employee → Generate invitation code
         ↓
Employee receives code
         ↓
Employee opens Soostori:
  [ Join Shop ] → Enter code
         ↓
Cloud validates invitation
         ↓
Device registered with cloud
         ↓
Employee data + permissions downloaded
         ↓
MOBILE OPERATIONAL
```

### 3-Day Subscription Verification (Mobile + Desktop)

Both devices cache entitlement independently. Either can verify. Either can be restricted.

```
ONLINE
  ↓
Cloud validates subscription
  ↓
Cloud provides server timestamp + verification deadline
  ↓
Device stores:
  - entitlement
  - serverTime
  - verifiedAt
  - nextVerificationDeadline
  ↓
3-day offline grace window starts
  ↓
Day 1-3: Full operation, no internet required
  ↓
Day 3 warning: "Reconnect to verify subscription"
  ↓
Day 4+: Restricted mode (owner only) until re-verified
```

**Clock manipulation protection:** All subscription deadlines use server-provided timestamps. Neither device relies solely on local clock.

---

## Local Database Schema (Mobile)

The local SQLite schema maps to cloud entities but is **not identical** to Instant DB:

```
LOCAL SQLITE (mobile)
  │
  ├── shops             — cloud shop reference + local config
  ├── employees         — cloud employee reference + local PIN hash
  ├── devices           — this device identity + cloud registration
  ├── invitations       — pending invitation codes
  ├── products          — local product data
  ├── inventory_transactions — event sourcing truth
  ├── sales / sale_items — local sales
  ├── customers         — local customer data
  ├── sync_queue        — pending cloud sync events
  ├── sync_state        — cursor + last sync timestamp
  ├── entitlement_cache — subscription state
  └── audit_logs        — local mutation audit trail
```

---

## What Mobile Must NOT Do

```
DO NOT:
- Invent Instant DB schema
- Invent authentication endpoints
- Directly couple business logic to Instant DB internals
- Make every POS operation require internet
- Make mobile depend on desktop for basic operation
- Create another local-only shop creation path (normal operation)
- Add new POS features before cloud contract is defined
- Remove offline SQLite capability
- Use Math.random() for any security-relevant ID generation
- Use weak hash functions for PIN storage
- Bypass inventory transaction event sourcing
```

---

## Implementation Phases

### Phase 0 — Architecture Contract ✅
1. Define `docs/sync-contract.md` with cloud team — **pending**
2. Define `src/contracts/cloud.ts` TypeScript interfaces — **pending**
3. Agree on authentication flow — **pending**
4. Agree on subscription entitlement model — **pending**
5. Agree on sync event schema — **pending**

> **Note:** While Phase 0 is being defined, mobile can continue with local-only work that doesn't require cloud contracts.

### Phase 1 — Mobile Hardening ✅ COMPLETE
1. ✅ Remove `|| newPin === '0000'` authentication bypass
2. ✅ Replace `Math.random()` device IDs with `crypto.getRandomValues()`
3. ✅ Make LAN events idempotent (check `status !== 'confirmed'` before applying)
4. ✅ Fix `applySaleConfirmed` to use `recordInventoryTransaction()` not raw SQL
5. ✅ Wire `HOST_HEARTBEAT` in `handleEvent()` + `useLanSync` hook
6. ✅ Add `SALE_RECONCILIATION_REQUIRED` handler + surface in `approvals.tsx`
7. ✅ Expose LAN connection status to UI
8. ✅ Add `writeAuditLog` calls to `createEmployee`, `adjustStock`, `createSale`
9. ✅ Add `schema_versions` table for migration tracking
10. ✅ Prepare local tables for cloud identity fields (cloud IDs, entitlement cache, sync state)

### Phase 2 — Cloud Identity (IN PROGRESS)
1. Implement online first-run (replace `welcome.tsx`)
2. Cloud login / registration
3. Shop association (cloud shop ID stored locally)
4. Employee association (cloud employee ID stored locally)
5. Device registration with cloud
6. Invitation flow (cloud-issued codes)
7. Permission downloading and caching
8. Entitlement cache with 3-day window
9. Subscription enforcement (3-day verification, restricted mode)

### Phase 3 — Cloud Synchronization
1. `sync_queue` processor (upload queued events when online)
2. Download remote events from cloud
3. Cursor/sequence management
4. Retry mechanism with exponential backoff
5. Conflict detection and reporting

### Phase 4 — Recovery
1. Full snapshot download on new device
2. Device replacement flow
3. Employee reinstall recovery
4. Backup verification

---

## Desktop Role

Desktop is **optional**. It is not a required gateway. A shop can run fully on mobile without any desktop.

Desktop responsibilities when present:
- LAN WebSocket server (port 18792) — optional local authority
- Local SQLite as operational database
- Real-time stock coordination with connected mobiles
- Sale confirmation/validation for LAN-connected clients
- Device pairing approval (LAN)
- Conflict resolution authority (LAN)
- Cloud sync when internet available — same as mobile

Desktop does **not** require internet for local operation. It does **not** gate mobile's cloud access.

---

## Mobile Role

Mobile is a **first-class Soostori client** that can operate a shop independently or connect to a desktop host.

Mobile capabilities:
- Full offline POS operation via SQLite
- Local Wi-Fi synchronization with other mobiles or desktop
- Direct cloud authentication and subscription via Instant DB
- Shop management (when owner)
- Employee and device management (when owner/manager)
- Inventory management
- All standard POS functions
- Can act as local shop authority (owner mode) when no desktop present

Mobile connects to cloud **directly**, not through desktop.

---

## Subscription Enforcement (Mobile + Desktop)

Subscription applies to both Mobile and Desktop equally:
- Both cache cloud entitlement locally after first online auth
- Both use the 3-day verification window
- Both enter restricted mode independently if window expires
- Both are recoverable from cloud after device replacement
- Neither device can modify subscription dates locally



---

## Conflict Resolution

When two devices sell the same inventory item simultaneously (offline):

```
Device A: SALE_PENDING (qty=3, stock=5)
Device B: SALE_PENDING (qty=4, stock=5)
     ↓
Both write locally with 'pending_offline' status
     ↓
On reconnect: events sent to host
     ↓
Host detects stock conflict
     ↓
SALE_RECONCILIATION_REQUIRED emitted
     ↓
Manager/Owner sees conflict in Approvals
     ↓
Options: Partial Fulfill | Cancel Sale | Escalate
     ↓
Resolution recorded in sync_conflicts + audit_logs
     ↓
Synced to cloud
```

---

## Audit Logging Requirements

All significant mutations must write to `audit_logs`:

| Action | Entity Type | Notes |
|--------|-------------|-------|
| Employee created | employee | Include role |
| Employee deactivated | employee | — |
| PIN changed | employee | No old PIN |
| Device paired | device | Include device name |
| Device revoked | device | — |
| Product price changed | product | old + new price |
| Stock adjusted | product | delta + reason |
| Sale completed | sale | total + payment method |
| Sale cancelled | sale | reason |
| Subscription verified | shop | server timestamp |
| Shop settings changed | shop_settings | field + old/new |

---

## File Naming Convention (ANPAS)

All files must follow `[domain]-[action]-type.ts` pattern.

```
DO NOT USE:
  helpers.ts
  common.ts
  utils.ts
  misc.ts
  tools.ts
```

---

## No AI Visual Vocabulary

**Strictly forbidden:**
- ✨ sparkle (reserved for actual AI features only)
- 🪄 magic wand
- 🧠 brain
- 🤖 robot
- Orb / lightning-as-decoration / neural nodes
- Purple/violet gradient backgrounds
- Glassmorphism
- Pulsing glow / shimmer effects

Use Lucide icons for all UI iconography.
