/**
 * expo-push-channel.ts — Phase 17 Expo Push delivery channel
 *
 * Responsibilities:
 * - Request NOTIFICATIONS permission on first launch
 * - Register / store Expo push token per device
 * - Send local Expo notification with deep-link data (immediate delivery)
 *
 * Fire-and-forget: failures are logged and do NOT block callers.
 * Push token registration is persisted; the token can be sent to a backend
 * server to enable server-initiated push notifications.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'

// expo-notifications is auto-linked via expo autolinking at build time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Notifications = require('expo-notifications').default
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ExpoDevice = require('expo-device').default

const PUSH_TOKEN_KEY = '@soostori:expoPushToken'

// ── Permission ────────────────────────────────────────────────────────────────

/** Request notification permission; returns false if denied/blocked. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!ExpoDevice.isDevice) return false
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

// ── Token management ──────────────────────────────────────────────────────────

/** Save the Expo push token (for server-side push). */
export async function savePushToken(token: string): Promise<void> {
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token)
}

/** Retrieve the stored Expo push token. */
export async function getPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY)
}

/**
 * Register this device for Expo push notifications.
 * Returns the push token (sent to backend for server-initiated push).
 * Safe to call multiple times — no-op if permission denied.
 */
export async function registerForPush(): Promise<string | null> {
  const hasPermission = await requestNotificationPermission()
  if (!hasPermission) return null
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: getProjectId(),
    })
    if (token) await savePushToken(token)
    return token
  } catch (err) {
    console.warn('[ExpoPush] Failed to get push token:', err)
    return null
  }
}

function getProjectId(): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants').default
    return Constants.expoConfig?.extra?.eas?.projectId as string | undefined
  } catch {
    return undefined
  }
}

// ── Deep-link helpers ─────────────────────────────────────────────────────────

export type NotificationDeepLink = {
  screen: string
  params?: Record<string, string>
}

/** Map SyncEvent types → in-app deep links. */
export function eventToDeepLink(
  eventType: string,
  payload: Record<string, unknown>,
): NotificationDeepLink | null {
  switch (eventType) {
    case 'sale.created':
      return { screen: '/sales-history', params: { saleId: String(payload.saleId ?? '') } }
    case 'debt.payment_recorded':
    case 'debt.created':
    case 'debt.settled':
      return { screen: '/debt', params: { debtId: String(payload.debtId ?? '') } }
    case 'inventory.low_stock':
      return { screen: '/low-stock', params: { productId: String(payload.productId ?? '') } }
    case 'inventory.received':
    case 'inventory.adjusted':
      return { screen: '/inventory', params: { productId: String(payload.productId ?? '') } }
    case 'expense.created':
    case 'expense.approved':
      return { screen: '/expenses', params: { expenseId: String(payload.expenseId ?? '') } }
    case 'commission.created':
      return { screen: '/commissions', params: { commissionId: String(payload.commissionId ?? '') } }
    case 'team.member_added':
      return { screen: '/team' }
    case 'device.enrolled':
      return { screen: '/devices' }
    default:
      return { screen: '/notifications' }
  }
}

/** Build a path+params string for expo-router navigation. */
export function buildDeepLinkPath(
  eventType: string,
  payload: Record<string, unknown>,
): { pathname: string; params?: Record<string, string> } {
  const link = eventToDeepLink(eventType, payload)
  if (!link) return { pathname: '/notifications' }
  // Strip leading slash for expo-router
  const pathname = link.screen.startsWith('/') ? link.screen.slice(1) : link.screen
  return { pathname, params: link.params }
}

// ── Notification payload ─────────────────────────────────────────────────────

export interface ExpoNotificationPayload {
  title: string
  body: string
  eventType: string
  payload: Record<string, unknown>
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

/** Priority → expo-notifications priority string. */
function mapPriority(p: string): 'min' | 'low' | 'default' | 'high' {
  if (p === 'urgent' || p === 'high') return 'high'
  if (p === 'low') return 'low'
  return 'default'
}

// ── Send notification ────────────────────────────────────────────────────────

/**
 * Send an immediate local notification via Expo.
 * This is the in-app path — fires instantly without server involvement.
 * Safe to call from sync engine: errors are caught and never thrown.
 */
export async function sendExpoNotification(data: ExpoNotificationPayload): Promise<void> {
  try {
    const { title, body, eventType, payload, priority = 'normal' } = data
    const { pathname, params } = buildDeepLinkPath(eventType, payload)

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { eventType, payload, deepLink: pathname, params },
        sound: priority === 'urgent' || priority === 'high' ? 'default' : undefined,
      },
      trigger: null, // immediate
    })
  } catch (err) {
    console.warn('[ExpoPush] scheduleNotification failed:', err)
  }
}

/**
 * Send a push notification to a specific Expo push token (server-initiated path).
 * Requires the app's Expo push credentials — call this from a backend.
 * Falls back gracefully on error (fire-and-forget).
 */
export async function sendPushToToken(
  token: string,
  data: ExpoNotificationPayload,
): Promise<void> {
  try {
    const { title, body, eventType, payload, priority = 'normal' } = data
    const { pathname, params } = buildDeepLinkPath(eventType, payload)

    await Notifications.sendPushNotificationAsync({
      to: token,
      title,
      body,
      data: { eventType, payload, deepLink: pathname, params },
      sound: priority === 'urgent' || priority === 'high' ? 'default' : undefined,
      priority: mapPriority(priority),
    })
  } catch (err) {
    console.warn('[ExpoPush] sendPushToToken failed:', err)
  }
}
