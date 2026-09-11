// db-team.ts — Team management service (Phase 14)
// Business logic only — no UI imports. All mutations queue sync events.
import { getDb } from '../lib/db'
import { generateId } from '../lib/formatters'
import { queueSync } from './sync-queue-helper'
import { logAudit } from './db-audit'
import { enforceCapability, PERMISSIONS } from './sdk-bridge/rbac'
import { getCurrentMember } from './session-helper'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { EmployeeRole } from '@soostori/core'
import type { TeamInvitation, TeamMembership, MemberWithEmployee } from './db-team-types'

export type { TeamInvitation, TeamMembership, MemberWithEmployee } from './db-team-types'

function mapInvitationRow(row: Record<string, unknown>): TeamInvitation {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    invitedByEmployeeId: String(row.invited_by_employee_id),
    email: String(row.email),
    role: String(row.role) as EmployeeRole,
    status: String(row.status) as TeamInvitation['status'],
    expiresAt: String(row.expires_at),
    acceptedAt: row.accepted_at ? String(row.accepted_at) : undefined,
    createdAt: String(row.created_at),
  }
}

function mapMembershipRow(row: Record<string, unknown>): TeamMembership {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    personId: row.person_id ? String(row.person_id) : undefined,
    employeeId: String(row.employee_id),
    role: String(row.role) as EmployeeRole,
    permissions: row.permissions_json ? JSON.parse(String(row.permissions_json)) : [],
    joinedAt: String(row.joined_at),
  }
}

export async function inviteMember(
  businessId: string,
  email: string,
  role: EmployeeRole,
): Promise<TeamInvitation> {
  const member = await getCurrentMember()
  enforceCapability(member, PERMISSIONS.TEAM_MANAGE)

  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const employeeId = await AsyncStorage.getItem('@soostori:employeeId') ?? 'unknown'

  await db.runAsync(
    `INSERT INTO team_invitations
       (id, business_id, invited_by_employee_id, email, role, status, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
    [id, businessId, employeeId, email, role, expiresAt, now]
  )
  await queueSync('team_invitations', 'create', id, businessId)
  await logAudit(businessId, 'TEAM_INVITATION_CREATED', 'team_invitation', id, employeeId, undefined, undefined, JSON.stringify({ email, role }))
  return { id, businessId, invitedByEmployeeId: employeeId, email, role, status: 'pending', expiresAt, createdAt: now }
}

export async function listPendingInvitations(businessId: string): Promise<TeamInvitation[]> {
  const member = await getCurrentMember()
  enforceCapability(member, PERMISSIONS.TEAM_VIEW)

  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM team_invitations
       WHERE business_id = ? AND status = 'pending'
       ORDER BY created_at DESC`,
    [businessId]
  )
  return rows.map(mapInvitationRow)
}

export async function cancelInvitation(id: string, businessId: string): Promise<void> {
  const member = await getCurrentMember()
  enforceCapability(member, PERMISSIONS.TEAM_MANAGE)

  const db = await getDb()
  await db.runAsync(
    "UPDATE team_invitations SET status = 'expired' WHERE id = ? AND business_id = ?",
    [id, businessId]
  )
  await queueSync('team_invitations', 'update', id, businessId)
}

export async function listMembers(businessId: string): Promise<MemberWithEmployee[]> {
  const member = await getCurrentMember()
  enforceCapability(member, PERMISSIONS.TEAM_VIEW)

  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT tm.*, e.name as employee_name, e.email as employee_email
       FROM team_memberships tm
       JOIN employees e ON e.id = tm.employee_id
       WHERE tm.business_id = ?
       ORDER BY tm.joined_at DESC`,
    [businessId]
  )
  return rows.map(row => ({
    ...mapMembershipRow(row),
    employeeName: String(row.employee_name),
    employeeEmail: row.employee_email ? String(row.employee_email) : undefined,
  }))
}

export async function updateMemberRole(id: string, businessId: string, role: EmployeeRole): Promise<void> {
  const member = await getCurrentMember()
  enforceCapability(member, PERMISSIONS.TEAM_MANAGE)

  const db = await getDb()
  await db.runAsync(
    'UPDATE team_memberships SET role = ? WHERE id = ? AND business_id = ?',
    [role, id, businessId]
  )
  await queueSync('team_memberships', 'update', id, businessId)
}

export async function assignMemberPermission(
  id: string,
  businessId: string,
  permissions: string[],
): Promise<void> {
  const member = await getCurrentMember()
  enforceCapability(member, PERMISSIONS.TEAM_MANAGE)

  const db = await getDb()
  await db.runAsync(
    'UPDATE team_memberships SET permissions_json = ? WHERE id = ? AND business_id = ?',
    [JSON.stringify(permissions), id, businessId]
  )
  await queueSync('team_memberships', 'update', id, businessId)
}

export async function removeMember(id: string, businessId: string): Promise<void> {
  const member = await getCurrentMember()
  enforceCapability(member, PERMISSIONS.TEAM_MANAGE)

  const db = await getDb()
  await db.runAsync(
    'DELETE FROM team_memberships WHERE id = ? AND business_id = ?',
    [id, businessId]
  )
  await queueSync('team_memberships', 'delete', id, businessId)
}
