// lan-client-state.ts — Connection state management for LAN client
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

export interface LanClientState {
  ws: WebSocket | null
  serverIp: string | null
  deviceId: string | null
  lastSequenceNumber: number
  lastHeartbeat: string | null
  reconnectTimer: ReturnType<typeof setTimeout> | null
  reconnectAttempts: number
  maxReconnectAttempts: number
  isConnected: boolean
}

export function createInitialState(): LanClientState {
  return {
    ws: null,
    serverIp: null,
    deviceId: null,
    lastSequenceNumber: 0,
    lastHeartbeat: null,
    reconnectTimer: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
    isConnected: false,
  }
}

export function computeReconnectDelay(attempts: number): number {
  return Math.min(1000 * Math.pow(2, attempts), 30000)
}
