// lan-client.ts — WebSocket sync client for mobile (mobile is CLIENT, never host)
// Connects to desktop host at ws://<server_ip>:18792/ws
import AsyncStorage from '@react-native-async-storage/async-storage'
import type {
  SyncEvent,
  SyncEventType,
  SalePendingPayload,
  SaleConfirmedPayload,
  SaleRejectedPayload,
  StockUpdatedPayload,
  SaleReconciliationRequiredPayload,
} from '../lib/sync-protocol'
import { getDb } from '../lib/db'
import { generateSecureId } from '../lib/formatters'
import { recordInventoryTransaction } from './db-inventory-transactions'

const WS_PORT = 18792
const SERVER_IP_KEY = '@soostori:serverIp'
const DEVICE_ID_KEY = '@soostori:deviceId'
const LAST_SEQ_KEY = '@soostori:lastSequenceNumber'
const PAIRED_KEY = '@soostori:pairedDeviceId'

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
type EventHandler = (event: SyncEvent) => Promise<void>

interface LanClientConfig {
  onSalePending?: (payload: SalePendingPayload) => void
  onSaleConfirmed?: (payload: SaleConfirmedPayload) => void
  onSaleRejected?: (payload: SaleRejectedPayload) => void
  onStockUpdated?: (payload: StockUpdatedPayload) => void
  onDevicePaired?: (deviceId: string) => void
  onConnectionChange?: (state: ConnectionState) => void
  onHeartbeat?: (timestamp: string) => void
  onReconciliationRequired?: (payload: SaleReconciliationRequiredPayload) => void
}

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
  private eventHandlers: EventHandler[] = []

  async init(): Promise<void> {
    this.deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY)
    if (!this.deviceId) {
      this.deviceId = generateSecureId()
      await AsyncStorage.setItem(DEVICE_ID_KEY, this.deviceId)
    }
    const lastSeq = await AsyncStorage.getItem(LAST_SEQ_KEY)
    this.lastSequenceNumber = lastSeq ? parseInt(lastSeq, 10) : 0
    this.serverIp = await AsyncStorage.getItem(SERVER_IP_KEY)
  }

  configure(config: LanClientConfig): void {
    this.config = config
  }

  async storeServerIp(ip: string): Promise<void> {
    this.serverIp = ip
    await AsyncStorage.setItem(SERVER_IP_KEY, ip)
  }

  async getServerIp(): Promise<string | null> {
    return this.serverIp ?? AsyncStorage.getItem(SERVER_IP_KEY)
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  getDeviceId(): string | null {
    return this.deviceId
  }

  getLastHeartbeat(): string | null {
    return this.lastHeartbeat
  }

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
          // Send last known sequence number to receive all missed events
          this.send({ type: 'SYNC_REQUEST', lastSequenceNumber: this.lastSequenceNumber })
          resolve()
        }

        this.ws.onmessage = async (msg) => {
          try {
            const data = JSON.parse(msg.data) as { type?: string; eventType?: string; sequenceNumber?: number }
            if (data.type === 'SYNC_ACK') {
              this.lastSequenceNumber = data.sequenceNumber ?? this.lastSequenceNumber
              await AsyncStorage.setItem(LAST_SEQ_KEY, String(this.lastSequenceNumber))
              return
            }
            const event = data as SyncEvent
            this.lastSequenceNumber = Math.max(this.lastSequenceNumber, event.sequenceNumber)
            await AsyncStorage.setItem(LAST_SEQ_KEY, String(this.lastSequenceNumber))
            await this.handleEvent(event)
          } catch { /* ignore parse errors */ }
        }

        this.ws.onerror = () => {
          this.config.onConnectionChange?.('disconnected')
          reject(new Error('WebSocket error'))
        }

        this.ws.onclose = () => {
          this.config.onConnectionChange?.('disconnected')
          this.scheduleReconnect()
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return
    if (this.reconnectTimer) return

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
    this.reconnectAttempts++
    this.config.onConnectionChange?.('reconnecting')

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      try {
        await this.connect()
      } catch { /* will retry again */ }
    }, delay)
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
    this.config.onConnectionChange?.('disconnected')
  }

  private send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  private async handleEvent(event: SyncEvent): Promise<void> {
    const payload = JSON.parse(event.payload)

    switch (event.eventType) {
      case 'HOST_HEARTBEAT':
        this.lastHeartbeat = (payload as { timestamp: string }).timestamp
        this.config.onHeartbeat?.(this.lastHeartbeat)
        break
      case 'SALE_CONFIRMED':
        await this.applySaleConfirmed(payload as SaleConfirmedPayload)
        this.config.onSaleConfirmed?.(payload as SaleConfirmedPayload)
        break
      case 'SALE_REJECTED':
        await this.applySaleRejected(payload as SaleRejectedPayload)
        this.config.onSaleRejected?.(payload as SaleRejectedPayload)
        break
      case 'STOCK_UPDATED':
        await this.applyStockUpdated(payload as StockUpdatedPayload)
        this.config.onStockUpdated?.(payload as StockUpdatedPayload)
        break
      case 'DEVICE_PAIRED':
        this.config.onDevicePaired?.(event.deviceId)
        break
      case 'SALE_RECONCILIATION_REQUIRED':
        await this.applySaleReconciliationRequired(payload as SaleReconciliationRequiredPayload)
        this.config.onReconciliationRequired?.(payload as SaleReconciliationRequiredPayload)
        break
    }

    for (const handler of this.eventHandlers) {
      await handler(event)
    }
  }

  private async applySaleConfirmed(payload: SaleConfirmedPayload): Promise<void> {
    const db = await getDb()

    // Idempotency: skip if already confirmed
    const existing = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT status FROM sales WHERE id = ?`, [payload.saleId]
    )
    if (!existing || existing.status === 'confirmed') return

    await db.runAsync(
      `UPDATE sales SET status = 'confirmed', updated_at = ? WHERE id = ?`,
      [payload.timestamp, payload.saleId]
    )

    // Deduct stock via inventory transaction for proper event sourcing
    for (const item of payload.items) {
      if (item.variantName) {
        // Variants: update variant stock directly
        await db.runAsync(
          `UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE product_id = ? AND name = ? AND is_active = 1`,
          [item.quantity, item.productId, item.variantName]
        )
        // Also record transaction on the product for the variant
        await recordInventoryTransaction(
          'default', item.productId, 'SALE', item.quantity,
          undefined, undefined, item.variantName, payload.saleId
        )
      } else {
        await recordInventoryTransaction(
          'default', item.productId, 'SALE', item.quantity,
          undefined, undefined, undefined, payload.saleId
        )
      }
    }
  }

  private async applySaleRejected(payload: SaleRejectedPayload): Promise<void> {
    const db = await getDb()

    // Idempotency: skip if already rejected
    const existing = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT status FROM sales WHERE id = ?`, [payload.saleId]
    )
    if (!existing || existing.status === 'rejected') return

    await db.runAsync(
      `UPDATE sales SET status = 'rejected', updated_at = ? WHERE id = ?`,
      [payload.timestamp, payload.saleId]
    )
  }

  private async applyStockUpdated(payload: StockUpdatedPayload): Promise<void> {
    const db = await getDb()
    if (payload.variantName) {
      await db.runAsync(
        `UPDATE product_variants SET stock_quantity = ? WHERE product_id = ? AND name = ? AND is_active = 1`,
        [payload.newBalance, payload.productId, payload.variantName]
      )
    } else {
      await db.runAsync(
        `UPDATE products SET stock_quantity = ? WHERE id = ? AND is_active = 1`,
        [payload.newBalance, payload.productId]
      )
    }
  }

  private async applySaleReconciliationRequired(payload: SaleReconciliationRequiredPayload): Promise<void> {
    const db = await getDb()
    const { createConflict } = await import('./db-conflicts')
    await createConflict(
      'default',
      payload.saleId,
      payload.deviceId,
      'STOCK_CONFLICT',
      JSON.stringify(payload)
    )
  }

  addEventHandler(handler: EventHandler): () => void {
    this.eventHandlers.push(handler)
    return () => {
      this.eventHandlers = this.eventHandlers.filter((h) => h !== handler)
    }
  }

  // Emit SALE_PENDING to host (mobile initiates)
  emitSalePending(payload: Omit<SalePendingPayload, 'type'>): void {
    this.send({ type: 'SALE_PENDING', ...payload })
  }

  // Request device pairing (called before connect)
  async requestPairing(serverIp: string, deviceName: string): Promise<void> {
    await this.storeServerIp(serverIp)
    // Pairing is done via HTTP POST to host's REST endpoint
    // The host will then include DEVICE_PAIRED in the sync stream
    const resp = await fetch(`http://${serverIp}:${WS_PORT}/api/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: this.deviceId,
        deviceName,
        deviceType: 'mobile',
      }),
    })
    if (!resp.ok) throw new Error(`Pairing failed: ${resp.status}`)
  }
}

export const lanClient = new LanClient()
