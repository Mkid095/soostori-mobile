// lan-client-sync.ts — Sync logic and pairing for LAN client
import AsyncStorage from '@react-native-async-storage/async-storage'
import type {
  SalePendingPayload,
} from '../lib/sync-protocol'

const WS_PORT = 18792
const DEVICE_ID_KEY = '@soostori:deviceId'
const LAST_SEQ_KEY = '@soostori:lastSequenceNumber'

/**
 * Generate a secure device ID and persist it.
 */
export async function initDeviceId(): Promise<string> {
  const { generateSecureId } = await import('../lib/formatters')
  let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY)
  if (!deviceId) {
    deviceId = generateSecureId()
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId)
  }
  return deviceId
}

/**
 * Load the last known sequence number from storage.
 */
export async function loadLastSequenceNumber(): Promise<number> {
  const lastSeq = await AsyncStorage.getItem(LAST_SEQ_KEY)
  return lastSeq ? parseInt(lastSeq, 10) : 0
}

/**
 * Store the sequence number to AsyncStorage.
 */
export async function storeLastSequenceNumber(seq: number): Promise<void> {
  await AsyncStorage.setItem(LAST_SEQ_KEY, String(seq))
}

/**
 * Request pairing with a desktop host.
 * Pairing is done via HTTP POST to host's REST endpoint.
 * The host will then include DEVICE_PAIRED in the sync stream.
 */
export async function requestPairing(
  serverIp: string,
  deviceId: string,
  deviceName: string,
): Promise<void> {
  const resp = await fetch(`http://${serverIp}:${WS_PORT}/api/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId,
      deviceName,
      deviceType: 'mobile',
    }),
  })
  if (!resp.ok) throw new Error(`Pairing failed: ${resp.status}`)
}
