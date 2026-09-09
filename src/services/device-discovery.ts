// device-discovery.ts — BLE and WiFi device discovery for printers and scanners
import { BleManager, State } from 'react-native-ble-plx'
import NetInfo from '@react-native-community/netinfo'

const SPP_UUID = '00001101-0000-1000-8000-00805f9b34fb'
const LE_PRINTER_UUIDS = ['0000ff00-0000-1000-8000-00805f9b34fb', '49535343-FE7D-4AE5-8FA9-9FAFD205E455']
const HID_SERVICE_UUID = '00001812-0000-1000-8000-00805f9b34fb'

export interface BleDevice { id: string; name: string; rssi?: number; type: 'printer' | 'scanner' }
export interface WifiDevice { ip: string; name: string }

let bleManager: BleManager | null = null

function getBleManager(): BleManager | null {
  try { if (!bleManager) bleManager = new BleManager(); return bleManager } catch { return null }
}

function isPrinterName(name: string): boolean {
  const p = name.toLowerCase()
  return p.includes('printer') || p.includes('epson') || p.includes('star') ||
    p.includes('zjiang') || p.includes('tm-') || p.includes('sp2000') ||
    p.includes('pos') || p.includes('receipt') || p.includes('thermal')
}

function wait(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)) }
function dedupeById(d: BleDevice[], s = new Set<string>()): BleDevice[] { return d.filter(x => s.has(x.id) ? false : (s.add(x.id), true)) }
function dedupeByIp(d: WifiDevice[], s = new Set<string>()): WifiDevice[] { return d.filter(x => s.has(x.ip) ? false : (s.add(x.ip), true)) }

export async function requestBlePermissions(): Promise<boolean> {
  try {
    const m = getBleManager()
    if (!m) return false
    const s = await m.state()
    if (s === State.PoweredOn) return true
    return new Promise(r => m.onStateChange(ns => r(ns === State.PoweredOn), true))
  } catch { return false }
}

export async function scanBleDevices(timeoutMs = 8000): Promise<BleDevice[]> {
  const m = getBleManager()
  if (!m) return []
  const found: BleDevice[] = []
  try {
    await m.startDeviceScan([SPP_UUID, ...LE_PRINTER_UUIDS, HID_SERVICE_UUID], { allowDuplicates: false },
      (e, d) => { if (e || !d?.name) return; found.push({ id: d.id, name: d.name, rssi: d.rssi ?? undefined, type: isPrinterName(d.name) ? 'printer' : 'scanner' }) })
    await wait(timeoutMs)
  } catch { /* scan failed */ }
  finally { try { m.stopDeviceScan() } catch { /* ignore */ } }
  return dedupeById(found)
}

const COMMON_PRINTER_PORTS = [80, 443, 8080, 9100, 631]

export async function scanWifiPrinters(onFound?: (d: WifiDevice) => void, timeoutMs = 6000): Promise<WifiDevice[]> {
  const netInfo = await NetInfo.fetch()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const details = netInfo.details as any
  const gateway: string | undefined = details?.gateway ?? details?.router
  if (!gateway) return []
  const subnet = gateway.replace(/\.\d+$/, '')
  const found: WifiDevice[] = []
  const start = Date.now()
  for (let i = 1; i <= 254; i++) {
    if (Date.now() - start > timeoutMs) break
    const ip = `${subnet}.${i}`
    void (async () => {
      for (const port of COMMON_PRINTER_PORTS) {
        try {
          const ctrl = new AbortController()
          const t = setTimeout(() => ctrl.abort(), 1200)
          const res = await fetch(`http://${ip}:${port}`, { signal: ctrl.signal, method: 'HEAD' })
          clearTimeout(t)
          if (res.ok || res.status < 500) { found.push({ ip, name: `Printer @ ${ip}` }); onFound?.(found[found.length - 1]); break }
        } catch { /* port closed */ }
      }
    })()
    if (i % 20 === 0) await wait(100)
  }
  await wait(timeoutMs)
  return dedupeByIp(found)
}
