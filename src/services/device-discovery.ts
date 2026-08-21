// device-discovery.ts — BLE and WiFi device discovery for printers and scanners
import { BleManager, State } from 'react-native-ble-plx'
import NetInfo from '@react-native-community/netinfo'

// ── BLE Service UUIDs ───────────────────────────────────────────────────────────

// Standard Bluetooth Serial Port Profile (SPP) — used by most thermal receipt printers
const SPP_UUID = '00001101-0000-1000-8000-00805f9b34fb'
// Bluetooth LE printers (ESC/POS over GATT)
const LE_PRINTER_UUIDS = ['0000ff00-0000-1000-8000-00805f9b34fb', '49535343-FE7D-4AE5-8FA9-9FAFD205E455']
// Bluetooth LE scanners (HID keyboard mode — most barcode scanners)
const HID_SERVICE_UUID = '00001812-0000-1000-8000-00805f9b34fb'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BleDevice {
  id: string
  name: string
  rssi?: number
  type: 'printer' | 'scanner'
}

export interface WifiDevice {
  ip: string
  name: string
}

// ── BLE Discovery ─────────────────────────────────────────────────────────────

let bleManager: BleManager | null = null

function getBleManager(): BleManager | null {
  try {
    if (!bleManager) bleManager = new BleManager()
    return bleManager
  } catch {
    return null
  }
}

export async function requestBlePermissions(): Promise<boolean> {
  try {
    const manager = getBleManager()
    if (!manager) return false
    const state = await manager.state()
    if (state === State.PoweredOn) return true
    // Android: try to trigger permission request via onStateChange
    return new Promise(resolve => {
      manager.onStateChange(newState => {
        resolve(newState === State.PoweredOn)
      }, true)
    })
  } catch {
    return false
  }
}

export async function scanBleDevices(timeoutMs = 8000): Promise<BleDevice[]> {
  const manager = getBleManager()
  if (!manager) return []

  const found: BleDevice[] = []

  try {
    await manager.startDeviceScan(
      [SPP_UUID, ...LE_PRINTER_UUIDS, HID_SERVICE_UUID],
      { allowDuplicates: false },
      (error, device) => {
        if (error || !device) return
        if (device.name) {
          const type = isPrinterName(device.name) ? 'printer' : 'scanner'
          found.push({ id: device.id, name: device.name, rssi: device.rssi ?? undefined, type })
        }
      },
    )
    await wait(timeoutMs)
  } catch {
    // BLE scan failed — return empty list
  } finally {
    try { manager.stopDeviceScan() } catch { /* ignore */ }
  }

  return deduplicateById(found)
}

function isPrinterName(name: string): boolean {
  const p = name.toLowerCase()
  return p.includes('printer') || p.includes('epson') || p.includes('star') ||
    p.includes('zjiang') || p.includes('tm-') || p.includes('sp2000') ||
    p.includes('pos') || p.includes('receipt') || p.includes('thermal')
}

// ── WiFi Discovery ─────────────────────────────────────────────────────────────

const COMMON_PRINTER_PORTS = [80, 443, 8080, 9100, 631]

export async function scanWifiPrinters(
  onFound?: (device: WifiDevice) => void,
  timeoutMs = 6000,
): Promise<WifiDevice[]> {
  const netInfo = await NetInfo.fetch()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const details = netInfo.details as any
  const gateway: string | undefined = details?.gateway ?? details?.router
  if (!gateway) return []

  const subnet = gateway.replace(/\.\d+$/, '')
  const found: WifiDevice[] = []
  const start = Date.now()

  const batchSize = 20
  for (let i = 1; i <= 254; i++) {
    if (Date.now() - start > timeoutMs) break
    const ip = `${subnet}.${i}`
    void (async () => {
      for (const port of COMMON_PRINTER_PORTS) {
        try {
          const controller = new AbortController()
          const t = setTimeout(() => controller.abort(), 1200)
          const res = await fetch(`http://${ip}:${port}`, { signal: controller.signal, method: 'HEAD' })
          clearTimeout(t)
          if (res.ok || res.status < 500) {
            const device: WifiDevice = { ip, name: `Printer @ ${ip}` }
            found.push(device)
            onFound?.(device)
            break
          }
        } catch {
          // port closed or timeout
        }
      }
    })()
    if (i % batchSize === 0) await wait(100)
  }

  await wait(timeoutMs)
  return deduplicateByIp(found)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function deduplicateById(devices: BleDevice[]): BleDevice[] {
  const seen = new Set<string>()
  return devices.filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true })
}

function deduplicateByIp(devices: WifiDevice[]): WifiDevice[] {
  const seen = new Set<string>()
  return devices.filter(d => { if (seen.has(d.ip)) return false; seen.add(d.ip); return true })
}
