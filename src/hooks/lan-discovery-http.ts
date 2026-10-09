// lan-discovery-http.ts — HTTP helpers for LAN desktop-host discovery + pairing.
// Mobile is the client; desktop runs `src/services/lan-server.ts` which serves
// `GET /` and `POST /api/pair` on port 18792. No React state so it can be
// unit-tested with a simple assert runner.

export const LAN_DISCOVERY_PORT = 18792
const PING_TIMEOUT_MS = 5_000
const PAIR_TIMEOUT_MS = 10_000

export interface LanPingResult {
  status: string
  shopId: string
  deviceId: string
}

export type LanDiscoveryError =
  | { kind: 'invalid-ip' | 'unreachable' | 'timeout' | 'malformed'; message: string }
  | { kind: 'http' | 'pair-rejected'; message: string; status: number }

export class LanDiscoveryFailure extends Error {
  readonly detail: LanDiscoveryError
  constructor(detail: LanDiscoveryError) {
    super(detail.message)
    this.name = 'LanDiscoveryFailure'
    this.detail = detail
  }
}

function urlFor(serverIp: string, path: '/' | '/api/pair'): string {
  return `http://${serverIp.trim()}:${LAN_DISCOVERY_PORT}${path}`
}

function fail(detail: LanDiscoveryError): never {
  throw new LanDiscoveryFailure(detail)
}

function unreachableMsg(serverIp: string, verb: string): string {
  return `Could not reach the desktop at ${serverIp}:${LAN_DISCOVERY_PORT} ` +
    `(${verb} failed) — check the IP and that the desktop app is running.`
}

async function safeFetchJson(
  fetchImpl: typeof fetch,
  input: string,
  init: RequestInit,
  timeoutMs: number,
  serverIp: string,
  verb: string,
): Promise<Response> {
  try {
    return await fetchImpl(input, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      fail({
        kind: 'timeout',
        message: `Could not reach the desktop at ${serverIp}:${LAN_DISCOVERY_PORT} within ` +
          `${Math.round(timeoutMs / 1000)}s — check the IP and that the desktop app is running.`,
      })
    }
    fail({ kind: 'unreachable', message: unreachableMsg(serverIp, verb) })
  }
}

function ensureIp(serverIp: string): string {
  const trimmed = serverIp.trim()
  if (!trimmed) fail({ kind: 'invalid-ip', message: 'Server IP is required.' })
  return trimmed
}

export async function pingLanServer(
  serverIp: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LanPingResult> {
  const ip = ensureIp(serverIp)
  const resp = await safeFetchJson(
    fetchImpl, urlFor(ip, '/'), { method: 'GET' }, PING_TIMEOUT_MS, ip, 'discovery ping',
  )
  if (!resp.ok) {
    fail({ kind: 'http', status: resp.status,
      message: `Desktop host returned HTTP ${resp.status} on discovery ping.` })
  }
  let body: unknown
  try { body = await resp.json() } catch {
    fail({ kind: 'malformed', message: 'Desktop host returned a non-JSON discovery response.' })
  }
  if (!body || typeof body !== 'object'
      || typeof (body as Record<string, unknown>).status !== 'string'
      || typeof (body as Record<string, unknown>).shopId !== 'string'
      || typeof (body as Record<string, unknown>).deviceId !== 'string') {
    fail({ kind: 'malformed', message: 'Desktop host returned an unexpected discovery payload shape.' })
  }
  return body as LanPingResult
}

export async function requestLanPairing(args: {
  serverIp: string
  deviceId: string
  deviceName: string
  fetchImpl?: typeof fetch
}): Promise<void> {
  const ip = ensureIp(args.serverIp)
  const fetchImpl = args.fetchImpl ?? fetch
  const body = {
    deviceId: args.deviceId,
    deviceName: args.deviceName.trim() || 'Mobile Device',
    deviceType: 'mobile' as const,
  }
  const resp = await safeFetchJson(
    fetchImpl,
    urlFor(ip, '/api/pair'),
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    PAIR_TIMEOUT_MS,
    ip,
    'pairing request',
  )
  if (!resp.ok) {
    const payload = await resp.json().catch(() => ({} as Record<string, unknown>))
    const serverError = typeof payload.error === 'string' ? payload.error : undefined
    fail({
      kind: 'pair-rejected', status: resp.status,
      message: serverError ?? `Pairing rejected by desktop host (HTTP ${resp.status}).`,
    })
  }
}