// lan-server.ts — WebSocket + HTTP server for desktop host (port 18792)
// Mobile connects as client via lan-client.ts
// Desktop-only: this file is NOT imported by mobile builds
// Uses platform-specific imports to avoid RN build errors
import type { SyncEvent } from '../lib/sync-protocol'

const PORT = 18792

// ---------------------------------------------------------------------------
// Message types exchanged between LAN client and server
// ---------------------------------------------------------------------------

interface SyncRequestMessage {
  type: 'SYNC_REQUEST'
  lastSequenceNumber: number
}

interface SyncAckMessage {
  type: 'SYNC_ACK'
  sequenceNumber: number
}

interface SalePendingMessage {
  type: 'SALE_PENDING'
  saleId: string
  items: Array<{
    productId: string
    variantName?: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  totalAmount: number
  paymentMethod: string
  employeeId: string
  deviceId: string
  timestamp: string
}

type InboundMessage = SyncRequestMessage | SalePendingMessage | SyncEvent
type OutboundMessage = SyncAckMessage | SyncEvent

// ---------------------------------------------------------------------------
// Server option types
// ---------------------------------------------------------------------------

type EventHandler = (event: SyncEvent) => void | Promise<void>

interface LanServerOptions {
  shopId: string
  deviceId: string
  onEvent: EventHandler
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type PendingPairingEntry = {
  deviceId: string
  deviceName: string
  deviceType: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WsServer = import('ws').WebSocketServer<import('ws').WebSocket>
type HttpServer = import('http').Server
type WsSocket = import('ws').WebSocket

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class LanServerImpl {
  private shopId: string
  private deviceId: string
  private onEvent: EventHandler
  private wss: WsServer | null = null
  private httpServer: HttpServer | null = null
  private clients: Set<WsSocket> = new Set()
  private pendingPairings: Map<string, PendingPairingEntry> = new Map()

  constructor(options: LanServerOptions) {
    this.shopId = options.shopId
    this.deviceId = options.deviceId
    this.onEvent = options.onEvent
  }

  async start(): Promise<number> {
    // Dynamic imports — Node.js only (desktop build)
    const { WebSocketServer } = await import('ws')
    const http = await import('http')

    this.httpServer = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
      }

      if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok', shopId: this.shopId, deviceId: this.deviceId }))
        return
      }

      if (req.method === 'POST' && req.url === '/api/pair') {
        let body = ''
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString('utf-8')
        })
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body) as PendingPairingEntry
            this.pendingPairings.set(parsed.deviceId, parsed)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ status: 'pending', message: 'Pairing request received' }))
            await this.onEvent({
              id: parsed.deviceId,
              shopId: this.shopId,
              deviceId: parsed.deviceId,
              sequenceNumber: 0,
              eventType: 'DEVICE_PAIRED',
              payload: JSON.stringify({
                type: 'DEVICE_PAIRED',
                deviceId: parsed.deviceId,
                deviceName: parsed.deviceName,
                deviceType: parsed.deviceType,
              }),
              timestamp: new Date().toISOString(),
            })
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Invalid request body' }))
          }
        })
        return
      }

      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Not found' }))
    })

    return new Promise((resolve) => {
      this.httpServer!.listen(PORT, () => resolve(PORT))
      this.wss = new WebSocketServer({ server: this.httpServer!, path: '/ws' })
      this.wss.on('connection', (ws: WsSocket) => {
        this.clients.add(ws)
        ws.on('message', (data: unknown) => {
          this.handleMessage(ws, data)
        })
        ws.on('close', () => {
          this.clients.delete(ws)
        })
        ws.on('error', () => {
          this.clients.delete(ws)
        })
      })
    })
  }

  private async handleMessage(ws: WsSocket, data: unknown): Promise<void> {
    try {
      if (!this.isObject(data)) return
      const msg = data as Record<string, unknown>

      if (msg.type === 'SYNC_REQUEST') {
        const syncMsg = msg as unknown as SyncRequestMessage
        const ack: OutboundMessage = { type: 'SYNC_ACK', sequenceNumber: syncMsg.lastSequenceNumber ?? 0 }
        ws.send(JSON.stringify(ack))
        return
      }

      // All other messages (including SALE_PENDING) are SyncEvents
      const event = msg as unknown as SyncEvent
      await this.onEvent(event)
      this.broadcast(event, ws)
    } catch {
      // Ignore malformed
    }
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  broadcast(event: SyncEvent, exclude?: WsSocket): void {
    const msg = JSON.stringify(event)
    for (const client of this.clients) {
      if (client !== exclude) {
        try {
          client.send(msg)
        } catch {
          // ignore dead clients
        }
      }
    }
  }

  emit(event: SyncEvent): void {
    this.broadcast(event)
  }

  stop(): void {
    this.wss?.close()
    this.httpServer?.close()
  }
}

export const LanServer = LanServerImpl
export { PORT }
export type { LanServerOptions }
