// @ts-nocheck
// lan-server.ts — WebSocket + HTTP server for desktop host (port 18792)
// Mobile connects as client via lan-client.ts
// Desktop-only: this file is NOT imported by mobile builds
// Uses platform-specific imports to avoid RN build errors
import type { SyncEvent } from '../lib/sync-protocol'

const PORT = 18792

type EventHandler = (event: SyncEvent) => void | Promise<void>

interface LanServerOptions {
  shopId: string
  deviceId: string
  onEvent: EventHandler
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WsServer = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HttpServer = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WebSocket = any

class LanServerImpl {
  private shopId: string
  private deviceId: string
  private onEvent: EventHandler
  private wss: WsServer | null = null
  private httpServer: HttpServer | null = null
  private clients: Set<WebSocket> = new Set()

  constructor(options: LanServerOptions) {
    this.shopId = options.shopId
    this.deviceId = options.deviceId
    this.onEvent = options.onEvent
  }

  async start(): Promise<number> {
    // Dynamic imports — Node.js only (desktop build)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { WebSocketServer } = await import('ws')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const http = await import('http')

    this.httpServer = http.createServer((req: { method?: string; url?: string }, res: { setHeader?: (k: string, v: string) => void; writeHead?: (c: number, h?: Record<string, string>) => void; end?: (b?: string) => void }) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

      if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok', shopId: this.shopId, deviceId: this.deviceId }))
        return
      }

      if (req.method === 'POST' && req.url === '/api/pair') {
        let body = ''
        req.on('data', (chunk: string) => { body += chunk })
        req.on('end', async () => {
          try {
            const { deviceId, deviceName, deviceType } = JSON.parse(body)
            this.pendingPairings.set(deviceId, { deviceId, deviceName, deviceType })
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ status: 'pending', message: 'Pairing request received' }))
            await this.onEvent({
              id: deviceId, shopId: this.shopId, deviceId,
              sequenceNumber: 0,
              eventType: 'DEVICE_PAIRED',
              payload: JSON.stringify({ type: 'DEVICE_PAIRED', deviceId, deviceName, deviceType }),
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

    return new Promise((resolve: (port: number) => void) => {
      this.httpServer!.listen(PORT, () => resolve(PORT))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      this.wss = new WebSocketServer({ server: this.httpServer!, path: '/ws' })
      this.wss.on('connection', (ws: WebSocket) => {
        this.clients.add(ws)
        ws.on('message', (data: unknown) => { this.handleMessage(ws, data) })
        ws.on('close', () => { this.clients.delete(ws) })
        ws.on('error', () => { this.clients.delete(ws) })
      })
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pendingPairings: Map<string, { deviceId: string; deviceName: string; deviceType: string }> = new Map()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleMessage(ws: any, data: unknown): Promise<void> {
    try {
      const msg = JSON.parse(data as string)

      if (msg.type === 'SYNC_REQUEST') {
        ws.send(JSON.stringify({ type: 'SYNC_ACK', sequenceNumber: msg.lastSequenceNumber }))
        return
      }

      const event: SyncEvent = msg as SyncEvent
      await this.onEvent(event)
      this.broadcast(event, ws)
    } catch {
      // Ignore malformed
    }
  }

  broadcast(event: SyncEvent, exclude?: WebSocket): void {
    const msg = JSON.stringify(event)
    for (const client of this.clients) {
      if (client !== exclude) {
        try { client.send(msg) } catch { /* ignore dead clients */ }
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
