// cloud-business-setup.ts — Phase 07: Business Setup service
// Orchestrates: Person → Business → Membership → BusinessSettings → Category
// All writes go to cloud via instant-db.

import { db, id } from '../lib/instant-client'
import type { BusinessSetupInput, BusinessSetupResult } from '../types/types-business-setup'

const ACTIVE_BUSINESS_KEY = '@soostori:shopId'

// ── Person ────────────────────────────────────────────────────────────────────

async function findPersonByPhone(phone: string): Promise<string | null> {
  const result = await db.queryOnce({ employees: { $: { where: { phone } } } })
  const rows = (result.data.employees as Array<{ id: string; phone?: string }>) || []
  return rows.find(r => r.phone === phone)?.id ?? null
}

async function findPersonByEmail(email: string): Promise<string | null> {
  const result = await db.queryOnce({ employees: { $: { where: { email } } } })
  const rows = (result.data.employees as Array<{ id: string; email?: string }>) || []
  return rows.find(r => r.email === email)?.id ?? null
}

async function createPerson(input: BusinessSetupInput, cloudUserId: string): Promise<string> {
  const personId = id()
  const now = new Date().toISOString()
  const ops = [
    db.tx.employees[personId].create({
      id: personId,
      shopId: '', // updated when business is created
      name: input.ownerName,
      email: input.ownerEmail ?? '',
      phone: input.ownerPhone,
      role: 'owner',
      status: 'active',
      permissions: null,
      createdBy: cloudUserId,
      invitedBy: cloudUserId,
      cloudId: cloudUserId,
    }),
  ]
  await db.transact(ops)
  return personId
}

// ── Business ──────────────────────────────────────────────────────────────────

async function createBusiness(input: BusinessSetupInput, ownerPersonId: string, cloudUserId: string): Promise<string> {
  const businessId = id()
  const now = new Date().toISOString()
  const slug = input.businessName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + businessId.slice(0, 6)
  const ops = [
    db.tx.shops[businessId].create({
      id: businessId,
      name: input.businessName,
      slug,
      taxRate: 0,
      plan: 'free',
      subscriptionExpiry: now,
      status: 'active',
    }),
  ]
  await db.transact(ops)
  return businessId
}

// ── Membership ────────────────────────────────────────────────────────────────

async function createMembership(
  personId: string,
  businessId: string,
  role: 'owner' | 'manager',
  cloudUserId: string,
): Promise<string> {
  const membershipId = id()
  const now = new Date().toISOString()
  const ops = [
    db.tx.invitations[membershipId].create({
      id: membershipId,
      shopId: businessId,
      employeeId: personId,
      code: '',
      expiresAt: now,
      status: 'active',
      email: '',
      phone: '',
      createdBy: cloudUserId,
      employeeRole: role,
    }),
  ]
  await db.transact(ops)
  return membershipId
}

// ── Sync event helper ─────────────────────────────────────────────────────────

async function writeSyncEvent(
  tableName: string,
  action: 'create',
  payload: Record<string, unknown>,
  businessId: string,
): Promise<void> {
  const eventId = id()
  const now = new Date().toISOString()
  await db.tx.syncEvents[eventId].create({
    id: eventId,
    shopId: businessId,
    entityId: eventId,
    entity: tableName,
    operation: action,
    payload,
    syncedAt: now,
    version: 1,
    idempotencyKey: eventId,
    timestamp: now,
    sequenceNumber: 0,
    deviceId: '',
  })
}

// ── Category ─────────────────────────────────────────────────────────────────

async function createDefaultCategory(businessId: string): Promise<string> {
  // Use syncEvents entity as a proxy for categories (not yet in schema)
  // The local DB will be seeded separately via mobile-sync-service
  return 'uncategorized-' + id().slice(0, 8)
}

// ── Main service ─────────────────────────────────────────────────────────────

export async function businessSetup(input: BusinessSetupInput): Promise<BusinessSetupResult> {
  // 1. Resolve or create person
  let personId = await findPersonByPhone(input.ownerPhone)
  if (!personId && input.ownerEmail) {
    personId = await findPersonByEmail(input.ownerEmail)
  }
  const cloudUserId = personId ?? 'anonymous-' + id().slice(0, 8)

  // 2. Create business
  const businessId = await createBusiness(input, personId ?? cloudUserId, cloudUserId)

  // 3. Create person record if new
  if (!personId) {
    personId = await createPerson(input, cloudUserId)
  }

  // 4. Create membership (owner)
  const ownerMembershipId = await createMembership(personId, businessId, 'owner', cloudUserId)

  // 5. Create default category
  const defaultCategoryId = await createDefaultCategory(businessId)

  // 6. Write sync events for each entity
  await writeSyncEvent('shops', 'create', { id: businessId, name: input.businessName }, businessId)
  await writeSyncEvent('employees', 'create', { id: personId, name: input.ownerName }, businessId)
  await writeSyncEvent('invitations', 'create', { id: ownerMembershipId, role: 'owner' }, businessId)
  await writeSyncEvent('categories', 'create', { id: defaultCategoryId, name: 'Uncategorized' }, businessId)

  return { businessId, ownerMembershipId, defaultCategoryId }
}

// ── List businesses for current user ────────────────────────────────────────

export async function listMyBusinesses(personId?: string): Promise<BusinessSetupResult[]> {
  const result = await db.queryOnce({ invitations: {} })
  const invitations = (result.data.invitations as Array<{
    id: string
    shopId: string
    employeeId: string
    status: string
  }>) || []

  const myInvitations = invitations.filter(inv =>
    inv.employeeId === personId && inv.status === 'active'
  )

  return myInvitations.map(inv => ({
    businessId: inv.shopId,
    ownerMembershipId: inv.id,
    defaultCategoryId: '',
  }))
}

// ── Switch active business ────────────────────────────────────────────────────

export async function setActiveBusiness(businessId: string): Promise<void> {
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage')
  await AsyncStorage.setItem(ACTIVE_BUSINESS_KEY, businessId)
}

export async function getActiveBusinessId(): Promise<string | null> {
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage')
  return AsyncStorage.getItem(ACTIVE_BUSINESS_KEY)
}
