# Mobile — Phase 14 Team Management Status

**Cycle**: 2025-cycle-13 | **Worker**: Mobile | **Completed**: 2026-09-10

---

## What changed

Full team management feature built for soostori-mobile (Expo Router, SQLite).

---

## Files created

| File | Lines | Purpose |
|------|-------|---------|
| `src/services/db-team-types.ts` | 26 | `TeamInvitation`, `TeamMembership`, `MemberWithEmployee` types |
| `src/services/db-team.ts` | 150 | `inviteMember`, `listPendingInvitations`, `cancelInvitation`, `listMembers`, `updateMemberRole`, `assignMemberPermission`, `removeMember`. All mutations call `queueSync` and `logAudit`. |
| `src/hooks/useTeamMembers.ts` | 68 | Team members list with `team.view` + `team.manage` capability checks |
| `src/hooks/useTeamInvitations.ts` | 77 | Pending invitations with cancel mutation |
| `src/components/team/role-badge.tsx` | 41 | Role badge (Owner/Manager/Cashier/Attendant/Viewer) |
| `src/components/team/team-styles.ts` | 59 | Shared style constants |
| `src/components/team/team-screen-content.tsx` | 125 | Tab shell: Members + Invitations tabs, invite FAB, modals |
| `src/components/team/members-view.tsx` | 53 | Members list with role badges and change-role/remove actions |
| `src/components/team/invitations-view.tsx` | 49 | Pending invitations list with cancel action |
| `src/components/team/invite-modal.tsx` | 135 | Email + role picker modal |
| `src/components/team/role-picker-sheet.tsx` | 68 | Change role action sheet |
| `app/(tabs)/team.tsx` | 54 | Team tab page with Cashier/Attendant redirect |

## Files modified

| File | Change |
|------|--------|
| `src/lib/db-schema-team.ts` | Added `team_invitations` and `team_memberships` tables with indexes |
| `app/(tabs)/_layout.tsx` | Registered `team` tab screen |
| `src/components/bottom-tab-bar/bottom-tab-bar.tsx` | Added `TEAM_TAB`, `UsersIcon` import; `CAPABILITY_TABS[CAP.TEAM_VIEW]` now includes `TEAM_TAB` |
| `CHANGELOG.md` | Added Phase 14 entry |

---

## Capability gates implemented

| Gate | Enforced at |
|------|-------------|
| `team.view` | `listMembers()`, `listPendingInvitations()` — throws `PermissionDeniedError` if missing |
| `team.manage` | `inviteMember()`, `cancelInvitation()`, `updateMemberRole()`, `removeMember()`, `assignMemberPermission()` |
| Cashier/Attendant | `app/(tabs)/team.tsx` redirects to `/sell`; `BottomTabBar` hides team tab |

---

## Sync events

All mutations call `queueSync(table, action, id, businessId)`:
- `inviteMember` → `sync_queue` (create, `team_invitations`)
- `cancelInvitation` → `sync_queue` (update, `team_invitations`)
- `updateMemberRole` → `sync_queue` (update, `team_memberships`)
- `removeMember` → `sync_queue` (delete, `team_memberships`)
- `assignMemberPermission` → `sync_queue` (update, `team_memberships`)

---

## Verified

- All 12 source files ≤ 150 lines ✓
- RBAC via `enforceCapability(member, PERMISSIONS.TEAM_VIEW/TEAM_MANAGE)` in service layer ✓
- No business logic in UI components ✓
- CHANGELOG updated ✓
- No new dependencies ✓
- `src/services/db-team.ts` exports types via `export type { ... } from './db-team-types'` ✓
