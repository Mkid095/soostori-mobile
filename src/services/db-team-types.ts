// db-team-types.ts — Phase 14: Team domain types (extracted to stay under 150 lines)
import type { EmployeeRole } from '@soostori/core'

export type TeamInvitationStatus = 'pending' | 'accepted' | 'expired'

export interface TeamInvitation {
  id: string
  businessId: string
  invitedByEmployeeId: string
  email: string
  role: EmployeeRole
  status: TeamInvitationStatus
  expiresAt: string
  acceptedAt?: string
  createdAt: string
}

export interface TeamMembership {
  id: string
  businessId: string
  personId?: string
  employeeId: string
  role: EmployeeRole
  permissions: string[]
  joinedAt: string
}

export interface MemberWithEmployee extends TeamMembership {
  employeeName: string
  employeeEmail?: string
}
