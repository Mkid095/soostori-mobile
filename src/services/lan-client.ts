// lan-client.ts — WebSocket sync client for mobile (mobile is CLIENT, never host)
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { SyncEvent, SalePendingPayload } from '../lib/sync-protocol'
import { initDeviceId, loadLastSequenceNumber, storeLastSequenceNumber, requestPairing } from './lan-client-sync'
import type { LanClientConfig } from './lan-client-types'
import { createHandleEvent } from './lan-client-handlers'
import { createInitialState, computeReconnectDelay } from './lan-client-state'

const WS_PORT = 18792
const SERVER_IP_KEY = '@soostori:serverIp'

class LanClient {
  private ws: WebSocket | null = null
  private serverIp: string | null = null
  private deviceId: string | null = null
  private lastSequenceNumber = 0
  private lastHeartbeat: string | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private config: LanClientConfig = {}
  private eventHandlers: ((event: SyncEvent) => Promise<void>)[] = []

  async init(): Promise<void> {
    this.deviceId = await initDeviceId()
    this.lastSequenceNumber = await loadLastSequenceNumber()
    this.serverIp = await AsyncStorage.getItem(SERVER_IP_KEY)
  }

  configure(config: LanClientConfig): void { this.config = config }

  async storeServerIp(ip: string): Promise<void> {
    this.serverIp = ip
    await AsyncStorage.setItem(SERVER_IP_KEY, ip)
  }

  async getServerIp(): Promise<string | null> {
    return this.serverIp ?? AsyncStorage.getItem(SERVER_IP_KEY)
  }

  isConnected(): boolean { return this.ws?.readyState === WebSocket.OPEN }
  getDeviceId(): string | null { return this.deviceId }
  getLastHeartbeat(): string | null { return this.lastHeartbeat }

  async connect(): Promise<void> {
    if (!this.serverIp) return
    if (this.ws?.readyState === WebSocket.OPEN) return
    this.config.onConnectionChange?.('connecting')

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`ws://${this.serverIp}:${WS_PORT}/ws`)
        this.ws.onopen = async () => {
          this.reconnectAttempts = 0
          this.config.onConnectionChange?.('connected')
          this.send({ type: 'SYNC_REQUEST', lastSequenceNumber: this.lastSequenceNumber })
          resolve()
        }
        this.ws.onmessage = async (msg) => {
          try {
            const data = JSON.parse(msg.data) as { type?: string; sequenceNumber?: number }
            if (data.type === 'SYNC_ACK') {
              this.lastSequenceNumber = data.sequenceNumber ?? this.lastSequenceNumber
              await storeLastSequenceNumber(this.lastSequenceNumber)
              return
            }
            const event = data as SyncEvent
            this.lastSequenceNumber = Math.max(this.lastSequenceNumber, event.sequenceNumber)
            await storeLastSequenceNumber(this.lastSequenceNumber)
            await this.handleEvent(event)
          } catch { /* ignore */ }
        }
        this.ws.onerror = () => { this.config.onConnectionChange?.('disconnected'); reject(new Error('WebSocket error')) }
        this.ws.onclose = () => { this.config.onConnectionChange?.('disconnected'); this.scheduleReconnect() }
      } catch (err) { reject(err) }
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return
    if (this.reconnectTimer) return
    const delay = computeReconnectDelay(this.reconnectAttempts)
    this.reconnectAttempts++
    this.config.onConnectionChange?.('reconnecting')
    this.reconnectTimer = setTimeout(async () => { this.reconnectTimer = null; try { await this.connect() } catch { /* retry */ } }, delay)
  }

  disconnect(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null }
    this.ws?.close(); this.ws = null
    this.config.onConnectionChange?.('disconnected')
  }

  private send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(data))
  }

  private handleEvent = createHandleEvent({
    config: this.config,
    eventHandlers: this.eventHandlers,
    heartbeat: { current: null as string | null },
  })

  addEventHandler(handler: (event: SyncEvent) => Promise<void>): () => void {
    this.eventHandlers.push(handler)
    return () => { this.eventHandlers = this.eventHandlers.filter((h) => h !== handler) }
  }

  emitSalePending(payload: Omit<SalePendingPayload, 'type'>): void {
    this.send({ type: 'SALE_PENDING', ...payload })
  }

  async requestPairing(serverIp: string, deviceName: string): Promise<void> {
    await this.storeServerIp(serverIp)
    if (!this.deviceId) throw new Error('Device not initialized')
    await requestPairing(serverIp, this.deviceId, deviceName)
  }
}

export const lanClient = new LanClient()
