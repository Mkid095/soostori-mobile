// Type declarations for the `ws` WebSocket library (desktop-only)
// Mobile builds do not include this module, but the types are safe to declare.
declare module 'ws' {
  export class WebSocket {
    constructor(address: string, options?: Record<string, unknown>)
    send(data: string | Buffer, cb?: (err?: Error) => void): void
    close(code?: number, reason?: string): void
    on(event: 'message', cb: (data: Buffer | string) => void): void
    on(event: 'close', cb: (code: number, reason: Buffer) => void): void
    on(event: 'error', cb: (err: Error) => void): void
    on(event: 'open', cb: () => void): void
    readonly readyState: number
    static OPEN: number
    static CLOSED: number
  }

  export class WebSocketServer<T extends WebSocket = WebSocket> {
    constructor(options?: { server?: import('http').Server; path?: string; port?: number })
    on(event: 'connection', cb: (socket: T, request?: import('http').IncomingMessage) => void): void
    close(cb?: () => void): void
  }
}
