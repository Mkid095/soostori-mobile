// PrinterSection — receipt printer configuration with real BLE/WiFi discovery
import { useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { scanBleDevices, scanWifiPrinters, requestBlePermissions } from '../../services/device-discovery'
import type { BleDevice, WifiDevice } from '../../services/device-discovery'
import { PrinterOption } from './printer-option'
import { PrinterDiscoveryPanel } from './printer-discovery-panel'

interface Props {
  printerType: 'wifi' | 'bluetooth' | 'pdf'
  onPrinterTypeChange: (t: 'wifi' | 'bluetooth' | 'pdf') => void
}

export function PrinterSection({ printerType, onPrinterTypeChange }: Props) {
  const { card, text, textSecondary: textMuted, border, brand } = useTheme()
  const [testing, setTesting] = useState(false)
  const [bleFound, setBleFound] = useState<BleDevice[]>([])
  const [wifiFound, setWifiFound] = useState<WifiDevice[]>([])
  const [bleScanning, setBleScanning] = useState(false)
  const [wifiScanning, setWifiScanning] = useState(false)
  const [selectedBle, setSelectedBle] = useState<string | null>(null)
  const [selectedWifi, setSelectedWifi] = useState<string | null>(null)

  async function handleBleScan() {
    setBleScanning(true)
    setBleFound([])
    setSelectedBle(null)
    try {
      const ok = await requestBlePermissions()
      if (!ok) { Alert.alert('Permission Denied', 'Enable Bluetooth in system settings.'); setBleScanning(false); return }
      const devices = await scanBleDevices()
      setBleFound(devices.filter(d => d.type === 'printer'))
    } catch (e) { Alert.alert('Scan Error', String(e)) }
    finally { setBleScanning(false) }
  }

  async function handleWifiScan() {
    setWifiScanning(true)
    setWifiFound([])
    setSelectedWifi(null)
    try {
      const devices = await scanWifiPrinters()
      setWifiFound(devices)
    } catch (e) { Alert.alert('Scan Error', String(e)) }
    finally { setWifiScanning(false) }
  }

  function selectBle(device: BleDevice) {
    setSelectedBle(device.id)
    Alert.alert('Printer Selected', `${device.name}\nTap Test Print to try it.`)
  }

  function selectWifi(device: WifiDevice) {
    setSelectedWifi(device.ip)
    Alert.alert('Printer Selected', `Printer at ${device.ip}\nTap Test Print to try it.`)
  }

  async function handleTestPrint() {
    setTesting(true)
    try {
      const html = `<html><body style="font-family:monospace;padding:20px">
        <h2 style="text-align:center">Soostori POS</h2><hr/>
        <p>Test Print — ${new Date().toLocaleString()}</p>
        <p>Status: OK</p><hr/><p style="text-align:center">Thank you!</p>
      </body></html>`
      const { uri } = await Print.printToFileAsync({ html })
      // Ensure URI has a file:// prefix for Sharing across both platforms
      const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: 'Share Test Receipt' })
      } else {
        Alert.alert('PDF Ready', `Saved to ${uri}`)
      }
    } catch (e) { Alert.alert('Print Error', String(e)) }
    finally { setTesting(false) }
  }

  return (
    <View style={{ gap: 12 }}>
      {/* Info banner */}
      <View style={{ backgroundColor: card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: border }}>
        <Text style={{ fontSize: 12, color: textMuted, lineHeight: 18 }}>
          Select a printer method. Use <Text style={{ fontWeight: '700', color: text }}>Scan</Text> to discover available Bluetooth or WiFi printers on your network.
        </Text>
      </View>

      {/* Print method cards */}
      <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 12 }}>Print Method</Text>
        <PrinterOption title="Export as PDF" description="Generate a receipt PDF and share it" active={printerType === 'pdf'} brand={brand} onPress={() => onPrinterTypeChange('pdf')} />
        <View style={{ height: 1, backgroundColor: border, marginVertical: 8 }} />
        <PrinterOption title="WiFi Thermal Printer" description="ESC/POS printer on your local network" active={printerType === 'wifi'} brand={brand} onPress={() => onPrinterTypeChange('wifi')} />
        <View style={{ height: 1, backgroundColor: border, marginVertical: 8 }} />
        <PrinterOption title="Bluetooth Printer" description="Paired Bluetooth thermal printer" active={printerType === 'bluetooth'} brand={brand} onPress={() => onPrinterTypeChange('bluetooth')} />
      </View>

      {/* WiFi printer discovery */}
      {printerType === 'wifi' && (
        <PrinterDiscoveryPanel
          title="WiFi Printers"
          scanning={wifiScanning}
          devices={wifiFound.map(d => ({ id: d.ip, name: d.name, subtitle: d.ip }))}
          selectedId={selectedWifi}
          onScan={handleWifiScan}
          onSelect={(id) => selectWifi({ ip: id, name: `Printer @ ${id}` })}
        />
      )}

      {/* Bluetooth printer discovery */}
      {printerType === 'bluetooth' && (
        <PrinterDiscoveryPanel
          title="Bluetooth Printers"
          scanning={bleScanning}
          devices={bleFound.map(d => ({ id: d.id, name: d.name, subtitle: d.rssi !== undefined ? `${d.rssi} dBm` : '' }))}
          selectedId={selectedBle}
          onScan={handleBleScan}
          onSelect={(id) => {
            const d = bleFound.find(b => b.id === id)
            if (d) selectBle(d)
          }}
        />
      )}

      {/* Test print button */}
      <TouchableOpacity
        style={{ backgroundColor: brand, borderRadius: 10, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
        onPress={handleTestPrint}
        disabled={testing}
      >
        {testing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Test Print</Text>}
      </TouchableOpacity>
    </View>
  )
}

