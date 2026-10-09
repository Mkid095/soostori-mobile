/**
 * lan-discovery-http.test.ts — Tests for `src/hooks/lan-discovery-http.ts`.
 *
 * Covers the P0-10 mobile LAN discovery fix: the hook must hit `GET /`
 * (not `/api/ping`) on the desktop host and produce actionable error
 * messages when the host is unreachable, times out, or returns 404.
 *
 * Pure logic + fake-fetch; no React, no native modules.
 * Run with: npx tsx src/hooks/__tests__/lan-discovery-http.test.ts
 */

import { pingLanServer, requestLanPairing, LanDiscoveryFailure, LAN_DISCOVERY_PORT } from '../lan-discovery-http'

let passed = 0
let failed = 0

function assert(name: string, cond: boolean): void {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}`); failed++ }
}

interface FakeCall { url: string; init: RequestInit | undefined }

interface FakeFetch {
  fn: typeof fetch
  calls: FakeCall[]
}

function okJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function fakeFetch(respond: (call: FakeCall) => Response): FakeFetch {
  const calls: FakeCall[] = []
  const fn = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    const entry: FakeCall = { url, init }
    calls.push(entry)
    return Promise.resolve(respond(entry))
  }) as unknown as typeof fetch
  return { fn, calls }
}

function signalIsAbortSignal(init: RequestInit | undefined): boolean {
  return init?.signal instanceof AbortSignal
}

async function run(): Promise<void> {
  console.log('\n=== LAN discovery HTTP tests (P0-10) ===\n')

  // ── [1] pings GET / not /api/ping ─────────────────────────────────────
  {
    const f = fakeFetch(() => okJson({ status: 'ok', shopId: 's1', deviceId: 'd1' }))
    const result = await pingLanServer('192.168.1.10', f.fn)
    assert('[1a] hits http://IP:18792/ (root)', f.calls[0]?.url === `http://192.168.1.10:${LAN_DISCOVERY_PORT}/`)
    assert('[1b] uses GET method', f.calls[0]?.init?.method === 'GET')
    assert('[1c] never calls /api/ping', !f.calls.some(c => c.url.includes('/api/ping')))
    assert('[1d] result.status parsed', result.status === 'ok')
    assert('[1e] result.shopId parsed', result.shopId === 's1')
    assert('[1f] result.deviceId parsed', result.deviceId === 'd1')
  }

  // ── [2] ping uses an AbortSignal with a finite timeout ────────────────
  {
    const f = fakeFetch(() => okJson({ status: 'ok', shopId: 's', deviceId: 'd' }))
    await pingLanServer('10.0.0.1', f.fn)
    assert('[2a] AbortSignal attached', signalIsAbortSignal(f.calls[0]?.init))
  }

  // ── [3] trims whitespace around the IP ────────────────────────────────
  {
    const f = fakeFetch(() => okJson({ status: 'ok', shopId: 's', deviceId: 'd' }))
    await pingLanServer('   192.168.1.10   ', f.fn)
    assert('[3] whitespace IP is trimmed in URL', f.calls[0]?.url === `http://192.168.1.10:${LAN_DISCOVERY_PORT}/`)
  }

  // ── [4] rejects empty IP without calling fetch ────────────────────────
  {
    const f = fakeFetch(() => okJson({}) as Response)
    let caught: unknown = null
    try { await pingLanServer('   ', f.fn) } catch (e) { caught = e }
    assert('[4a] empty IP throws LanDiscoveryFailure', caught instanceof LanDiscoveryFailure)
    assert('[4b] empty IP has kind=invalid-ip', caught instanceof LanDiscoveryFailure && caught.detail.kind === 'invalid-ip')
    assert('[4c] empty IP does NOT call fetch', f.calls.length === 0)
  }

  // ── [5] 404 produces a clear error (the original P0-10 bug) ──────────
  {
    const f = fakeFetch(() => okJson({ error: 'Not found' }, 404))
    let caught: unknown = null
    try { await pingLanServer('192.168.1.1', f.fn) } catch (e) { caught = e }
    assert('[5a] 404 throws LanDiscoveryFailure', caught instanceof LanDiscoveryFailure)
    assert('[5b] 404 kind = http', caught instanceof LanDiscoveryFailure && caught.detail.kind === 'http')
    assert('[5c] 404 carries status code', caught instanceof LanDiscoveryFailure && caught.detail.kind === 'http' && caught.detail.status === 404)
    assert('[5d] 404 message references status code',
      caught instanceof LanDiscoveryFailure && /404/.test(caught.detail.message))
  }

  // ── [6] network error (refused) → unreachable with IP+port hint ───────
  {
    const fn = (() => Promise.reject(new TypeError('fetch failed'))) as unknown as typeof fetch
    let caught: unknown = null
    try { await pingLanServer('192.168.1.99', fn) } catch (e) { caught = e }
    assert('[6a] network error throws LanDiscoveryFailure', caught instanceof LanDiscoveryFailure)
    assert('[6b] network error kind = unreachable', caught instanceof LanDiscoveryFailure && caught.detail.kind === 'unreachable')
    assert('[6c] network error message includes IP',
      caught instanceof LanDiscoveryFailure && caught.detail.message.includes('192.168.1.99'))
    assert('[6d] network error message includes port',
      caught instanceof LanDiscoveryFailure && caught.detail.message.includes(String(LAN_DISCOVERY_PORT)))
    assert('[6e] network error message suggests checking the desktop app',
      caught instanceof LanDiscoveryFailure && /desktop app is running/.test(caught.detail.message))
  }

  // ── [7] timeout (DOMException TimeoutError) → clear timeout message ───
  // Abort immediately so we don't have to wait the full 5s AbortSignal.timeout window.
  {
    const fn = ((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      const sig = init?.signal as AbortSignal | undefined
      if (sig && !sig.aborted) {
        queueMicrotask(() => {
          reject(new DOMException('aborted', 'TimeoutError'))
        })
      }
    })) as unknown as typeof fetch
    let caught: unknown = null
    try { await pingLanServer('10.0.0.99', fn) } catch (e) { caught = e }
    assert('[7a] timeout throws LanDiscoveryFailure', caught instanceof LanDiscoveryFailure)
    assert('[7b] timeout kind = timeout', caught instanceof LanDiscoveryFailure && caught.detail.kind === 'timeout')
    assert('[7c] timeout message includes "s" window', caught instanceof LanDiscoveryFailure && /\d+s/.test(caught.detail.message))
  }

  // ── [8] malformed JSON → malformed error ─────────────────────────────
  {
    const fn = (() => Promise.resolve(new Response('not-json', { status: 200 }))) as unknown as typeof fetch
    let caught: unknown = null
    try { await pingLanServer('192.168.1.10', fn) } catch (e) { caught = e }
    assert('[8a] non-JSON throws LanDiscoveryFailure', caught instanceof LanDiscoveryFailure)
    assert('[8b] non-JSON kind = malformed', caught instanceof LanDiscoveryFailure && caught.detail.kind === 'malformed')
  }

  // ── [9] unexpected payload shape → malformed error ────────────────────
  {
    const f = fakeFetch(() => okJson({ hello: 'world' }))
    let caught: unknown = null
    try { await pingLanServer('192.168.1.10', f.fn) } catch (e) { caught = e }
    assert('[9a] bad shape throws', caught instanceof LanDiscoveryFailure)
    assert('[9b] bad shape kind = malformed', caught instanceof LanDiscoveryFailure && caught.detail.kind === 'malformed')
  }

  // ── [10] pairing POSTs to /api/pair with the right body ───────────────
  {
    const f = fakeFetch(() => okJson({ status: 'pending' }))
    await requestLanPairing({ serverIp: '192.168.1.10', deviceId: 'dev-42', deviceName: 'Phone', fetchImpl: f.fn })
    assert('[10a] POSTs to /api/pair', f.calls[0]?.url === `http://192.168.1.10:${LAN_DISCOVERY_PORT}/api/pair`)
    assert('[10b] uses POST method', f.calls[0]?.init?.method === 'POST')
    assert('[10c] Content-Type: application/json', (f.calls[0]?.init?.headers as Record<string, string>)['Content-Type'] === 'application/json')
    const body = JSON.parse((f.calls[0]?.init?.body as string) ?? '{}')
    assert('[10d] body.deviceId', body.deviceId === 'dev-42')
    assert('[10e] body.deviceName', body.deviceName === 'Phone')
    assert('[10f] body.deviceType=mobile', body.deviceType === 'mobile')
    assert('[10g] uses AbortSignal timeout', signalIsAbortSignal(f.calls[0]?.init))
  }

  // ── [11] pairing default falls back to 'Mobile Device' name ────────────
  {
    const f = fakeFetch(() => okJson({ status: 'pending' }))
    await requestLanPairing({ serverIp: '192.168.1.10', deviceId: 'd', deviceName: '   ', fetchImpl: f.fn })
    const body = JSON.parse((f.calls[0]?.init?.body as string) ?? '{}')
    assert('[11] whitespace deviceName defaults to "Mobile Device"', body.deviceName === 'Mobile Device')
  }

  // ── [12] pairing rejection surfaces server message + status ──────────
  {
    const f = fakeFetch(() => okJson({ error: 'Pairing already pending' }, 409))
    let caught: unknown = null
    try { await requestLanPairing({ serverIp: '192.168.1.10', deviceId: 'd', deviceName: 'Phone', fetchImpl: f.fn }) } catch (e) { caught = e }
    assert('[12a] 409 throws LanDiscoveryFailure', caught instanceof LanDiscoveryFailure)
    assert('[12b] 409 kind = pair-rejected', caught instanceof LanDiscoveryFailure && caught.detail.kind === 'pair-rejected')
    assert('[12c] 409 carries status', caught instanceof LanDiscoveryFailure && caught.detail.kind === 'pair-rejected' && caught.detail.status === 409)
    assert('[12d] 409 carries server error message',
      caught instanceof LanDiscoveryFailure && /Pairing already pending/.test(caught.detail.message))
  }

  // ── [13] pairing falls back to status-only message when body is bad ───
  {
    const fn = (() => Promise.resolve(new Response('garbage', { status: 500 }))) as unknown as typeof fetch
    let caught: unknown = null
    try { await requestLanPairing({ serverIp: '192.168.1.10', deviceId: 'd', deviceName: 'Phone', fetchImpl: fn }) } catch (e) { caught = e }
    assert('[13a] bad body throws', caught instanceof LanDiscoveryFailure)
    assert('[13b] bad body kind = pair-rejected', caught instanceof LanDiscoveryFailure && caught.detail.kind === 'pair-rejected')
    assert('[13c] bad body falls back to HTTP-status message',
      caught instanceof LanDiscoveryFailure && /500/.test(caught.detail.message))
  }

  // ── [14] pairing rejects empty IP ────────────────────────────────────
  {
    const f = fakeFetch(() => okJson({}) as Response)
    let caught: unknown = null
    try { await requestLanPairing({ serverIp: '   ', deviceId: 'd', deviceName: 'Phone', fetchImpl: f.fn }) } catch (e) { caught = e }
    assert('[14a] empty IP throws', caught instanceof LanDiscoveryFailure)
    assert('[14b] empty IP does NOT call fetch', f.calls.length === 0)
  }

  console.log(`\n${passed} passed, ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run().catch((err) => { console.error(err); process.exit(1) })