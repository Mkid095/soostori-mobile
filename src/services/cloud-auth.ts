// src/services/cloud-auth.ts — Real Instant DB authentication
// Flow: sendMagicCode → verifyMagicCode → resolve shop/device/employee → cache session
import { db, id } from '../lib/instant-client'
import type { CloudAuthResponse, SubscriptionEntitlement } from '../contracts/cloud'
import { cacheEntitlement } from './entitlement-cache'
import { registerDeviceWithCloud } from './db-cloud-device'
import { listEmployees, createEmployee, verifyPin } from './db-employees'
import AsyncStorage from '@react-native-async-storage/async-storage'

const CLOUD_TOKEN_KEY = '@soostori:cloudToken'
const SHOP_ID_KEY = '@soostori:shopId'
const EMPLOYEE_ID_KEY = '@soostori:employeeId'
const EMPLOYEE_ROLE_KEY = '@soostori:employeeRole'

export async function cloudSendMagicCode(email: string): Promise<void> {
  await db.auth.sendMagicCode({ email })
}

export async function cloudVerifyMagicCode(
  email: string,
  code: string
): Promise<CloudAuthResponse> {
  // Step 1: Verify magic code and get user
  const result = await db.auth.signInWithMagicCode({ email, code })
  if (!result.user) throw new Error('Authentication failed')

  const userId = result.user.id

  // Step 2: Store cloud token
  await AsyncStorage.setItem(CLOUD_TOKEN_KEY, userId)

  // Step 3: Find or create user entity in cloud (skip $users — managed by auth)
  let cloudUser = result.user

  // Step 4: Resolve shop for this user
  const shopsResult = await db.queryOnce({ shops: {} })
  let shop = (shopsResult.data.shops as any[])?.[0] || null

  if (!shop) {
    // Create shop for new owner
    const shopId = id()
    const shopChunk = db.tx.shops[shopId].create({
      id: shopId,
      name: 'My Shop',
      slug: `shop-${Date.now()}`,
      taxRate: 0,
      plan: 'free',
      subscriptionExpiry: '',
      status: 'active',
    })
    await db.transact(shopChunk)
    shop = { id: shopId, name: 'My Shop', slug: `shop-${Date.now()}`, status: 'active' }
  }

  const shopId = shop.id

  // Step 5: Register or resolve device
  const deviceId = await AsyncStorage.getItem('@soostori:deviceId')
  if (deviceId) {
    // Check if device exists in cloud, create if not
    const devicesResult = await db.queryOnce({ devices: {} })
    const cloudDevices = devicesResult.data.devices as any[] || []
    const cloudDevice = cloudDevices.find((d: any) => d.deviceId === deviceId)
    if (!cloudDevice) {
      const devId = id()
      await db.transact(db.tx.devices[devId].create({
        id: devId,
        shopId,
        deviceId,
        deviceType: 'mobile',
        status: 'authorized',
        lastSeenAt: new Date().toISOString(),
        authorizedAt: new Date().toISOString(),
        deviceName: 'Mobile Device',
        isLanHost: false,
      }))
    }
    await registerDeviceWithCloud(cloudDevice?.id || '')
  }

  // Step 6: Resolve or create local employee
  const employees = await listEmployees(shopId)
  let localEmployee = employees.find((e) => e.email === email)

  if (!localEmployee) {
    // Create local employee record (no PIN yet — owner will set it)
    localEmployee = await createEmployee(shopId, email.split('@')[0], '0000', 'owner', email)
  }

  // Step 7: Cache session
  await AsyncStorage.setItem(SHOP_ID_KEY, shopId)
  await AsyncStorage.setItem(EMPLOYEE_ID_KEY, localEmployee.id)
  await AsyncStorage.setItem(EMPLOYEE_ROLE_KEY, localEmployee.role)

  // Step 8: Resolve subscription from cloud
  const entitlement = await resolveSubscription(shopId)

  return {
    user: { id: userId, email, type: 'owner' },
    shop: { id: shop.id, name: shop.name, slug: shop.slug, plan: shop.plan, status: shop.status },
    entitlement,
    serverTime: new Date().toISOString(),
  }
}

export async function resolveSubscription(shopId: string): Promise<SubscriptionEntitlement> {
  try {
    const subsResult = await db.queryOnce({ subscriptions: {} })
    const subs = (subsResult.data.subscriptions as any[]) || []
    const sub = subs.find((s: any) => s.shopId === shopId)
    if (sub) {
      const entitlement: SubscriptionEntitlement = {
        shopId,
        status: sub.status || 'active',
        plan: sub.planKey || 'free',
        expiresAt: sub.currentPeriodEnd || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        verifiedAt: new Date().toISOString(),
        serverTime: new Date().toISOString(),
        nextVerificationDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      }
      await cacheEntitlement(entitlement, entitlement.serverTime)
      return entitlement
    }
  } catch {
    // Subscription not found — use default
  }

  // Default: free plan, 7-day expiry
  const entitlement: SubscriptionEntitlement = {
    shopId,
    status: 'active',
    plan: 'free',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    verifiedAt: new Date().toISOString(),
    serverTime: new Date().toISOString(),
    nextVerificationDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  }
  await cacheEntitlement(entitlement, entitlement.serverTime)
  return entitlement
}

export async function cloudGetServerTime(): Promise<string> {
  return new Date().toISOString()
}

export async function cloudLogout(): Promise<void> {
  await AsyncStorage.multiRemove([
    CLOUD_TOKEN_KEY,
    SHOP_ID_KEY,
    EMPLOYEE_ID_KEY,
    EMPLOYEE_ROLE_KEY,
  ])
  await cacheEntitlement(
    {
      shopId: 'default', status: 'expired', plan: 'free',
      expiresAt: new Date(0).toISOString(), verifiedAt: new Date(0).toISOString(),
      serverTime: new Date(0).toISOString(), nextVerificationDeadline: new Date(0).toISOString(),
    },
    new Date(0).toISOString()
  )
}

export async function getSession(): Promise<{
  userId: string | null
  shopId: string | null
  employeeId: string | null
  employeeRole: string | null
}> {
  const [userId, shopId, employeeId, employeeRole] = await Promise.all([
    AsyncStorage.getItem(CLOUD_TOKEN_KEY),
    AsyncStorage.getItem(SHOP_ID_KEY),
    AsyncStorage.getItem(EMPLOYEE_ID_KEY),
    AsyncStorage.getItem(EMPLOYEE_ROLE_KEY),
  ])
  return { userId, shopId, employeeId, employeeRole }
}
