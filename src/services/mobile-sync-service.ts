/**
 * mobile-sync-service.ts — Phase 05 Real Sync Service
 *
 * Wires the real FIDScript-backed engine into the app:
 *  1. Monkey-patches `defaultSyncEngine` (from @soostori/contracts) at runtime
 *     so existing call sites (createProduct/createSale) automatically use the real engine
 *  2. Starts AppState + NetInfo listeners for resume/reconnect sync
 *  3. Provides triggerSync() for post-mutation sync
 *
 * Business isolation is enforced inside MobileSyncEngine.apply().
 */
import { AppState, AppStateStatus } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  ensureOutboxTable,
  enqueue as realEnqueue,
  pull as realPull,
  apply as realApply,
  pushOutbox,
} from './mobile-sync-engine'
import { getCurrentShopId } from './session-helper'
import {
  defaultSyncEngine as NoOpEngine,
  type SyncEvent,
} from '@soostori/contracts'

// ── Sync cursor ──────────────────────────────────────────────────────────────

const CURSOR_KEY = '@soostori:mobileSyncCursor'

export async function getSyncCursor(): Promise<string | null> {
  return AsyncStorage.getItem(CURSOR_KEY)
}

export async function setSyncCursor(ts: string): Promise<void> {
  await AsyncStorage.setItem(CURSOR_KEY, ts)
}

// ── Inject real engine into defaultSyncEngine ──────────────────────────────────

let syncInitialized = false

/**
 * initMobileSync — call once at app startup.
 * Monkey-patches `defaultSyncEngine` so all existing callers use the real engine.
 * Safe to call multiple times.
 */
export async function initMobileSync(): Promise<void> {
  if (syncInitialized) return
  syncInitialized = true

  await ensureOutboxTable()

  // Monkey-patch the singleton object that @soostori/contracts exports.
  // Since JS modules bind objects by reference, patching the object properties
  // affects all callers — no import changes needed in db-products-create.ts etc.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const engine = NoOpEngine as any
  engine.enqueue = realEnqueue
  engine.pull = realPull
  engine.apply = (local: unknown, event: SyncEvent) =>
    realApply(local, event, '') // shopId resolved internally in apply()
}

// ── Pull + Apply ─────────────────────────────────────────────────────────────

/**
 * pullAndApply — pull cloud events and apply them to local SQLite.
 * Called on app resume, network reconnect, and after mutations.
 */
export async function pullAndApply(): Promise<{ pulled: number; applied: number }> {
  const shopId = await getCurrentShopId()
  if (!shopId) return { pulled: 0, applied: 0 }

  const lastSyncAt = await getSyncCursor()
  const { events, cursor } = await realPull(lastSyncAt)
  if (events.length === 0) return { pulled: 0, applied: 0 }

  let applied = 0
  for (const event of events) {
    const result = await realApply(null, event, shopId)
    if (result.state === 'applied') applied++
  }

  if (cursor) await setSyncCursor(cursor)
  return { pulled: events.length, applied }
}

/**
 * triggerSync — push local outbox then pull cloud changes.
 * Called after every local mutation (createProduct, createSale).
 */
export async function triggerSync(): Promise<void> {
  try {
    await pushOutbox()
    await pullAndApply()
  } catch (err) {
    console.warn('[MobileSyncService] triggerSync failed:', err)
  }
}

// ── App State + NetInfo listeners ───────────────────────────────────────────

let appStateSubscription: { remove: () => void } | null = null
let netInfoSubscription: (() => void) | null = null
let wasOffline = false

/**
 * startSyncListeners — activate app-resume and net-reconnect sync.
 * Call from your root component's useEffect.
 */
export function startSyncListeners(): void {
  // AppState: 'active' → sync
  appStateSubscription = AppState.addEventListener(
    'change',
    async (state: AppStateStatus) => {
      if (state === 'active') {
        await triggerSync()
      }
    },
  )

  // NetInfo: isConnected=true + was offline → push + pull
  netInfoSubscription = NetInfo.addEventListener(state => {
    const online = state.isConnected && state.isInternetReachable !== false
    if (online && wasOffline) {
      wasOffline = false
      onNetworkReconnect()
    } else if (!online) {
      wasOffline = true
    }
  })
}

/**
 * stopSyncListeners — cleanup on unmount.
 */
export function stopSyncListeners(): void {
  appStateSubscription?.remove()
  appStateSubscription = null
  netInfoSubscription?.remove()
  netInfoSubscription = null
}

async function onNetworkReconnect(): Promise<void> {
  try {
    await pushOutbox()
    await triggerSync()
  } catch (err) {
    console.warn('[MobileSyncService] onNetworkReconnect failed:', err)
  }
}
