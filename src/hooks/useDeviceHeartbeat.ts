// useDeviceHeartbeat — updates device lastSeenAt on app focus (5-min interval)
import { useEffect } from 'react'
import { AppState } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const TICK_INTERVAL_MS = 60_000 // 1 minute — check if heartbeat is due

export function useDeviceHeartbeat(): void {
  useEffect(() => {
    let lastHeartbeat = Date.now()

    const tick = async (): Promise<void> => {
      if (Date.now() - lastHeartbeat < HEARTBEAT_INTERVAL_MS) return
      const deviceId = await AsyncStorage.getItem('@soostori:deviceId')
      // In a full implementation, this would call the cloud to update lastSeenAt
      // For now, just update local timestamp
      await AsyncStorage.setItem('@soostori:lastHeartbeat', new Date().toISOString())
      if (deviceId) {
        await AsyncStorage.setItem(`@soostori:heartbeat:${deviceId}`, new Date().toISOString())
      }
      lastHeartbeat = Date.now()
    }

    // Heartbeat immediately when app comes to foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        lastHeartbeat = 0
        tick()
      }
    })

    const interval = setInterval(() => { tick() }, TICK_INTERVAL_MS)

    return () => {
      sub.remove()
      clearInterval(interval)
    }
  }, [])
}
