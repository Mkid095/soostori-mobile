// ScannerSection — barcode scanner configuration with real BLE/WiFi discovery
import { useState } from 'react'
import { View, Text, Alert } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { scanBleDevices, requestBlePermissions } from '../../services/device-discovery'
import type { BleDevice } from '../../services/device-discovery'
import { ScannerOption } from './scanner-option'
import { ScannerDevicePanel } from './scanner-device-panel'

interface Props {
  useBluetoothScanner: boolean
  onBluetoothToggle: (val: boolean) => void
}

export function ScannerSection({ useBluetoothScanner, onBluetoothToggle }: Props) {
  const { card, text, textSecondary: textMuted, border, brand } = useTheme()
  const [discovered, setDiscovered] = useState<BleDevice[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)

  async function handleScan() {
    setScanning(true)
    setDiscovered([])
    setSelectedId(null)
    try {
      const ok = await requestBlePermissions()
      if (!ok) {
        setPermissionDenied(true)
        setScanning(false)
        return
      }
      const devices = await scanBleDevices()
      setDiscovered(devices)
    } catch (e) {
      Alert.alert('Scan Error', String(e))
    } finally {
      setScanning(false)
    }
  }

  function handleSelect(device: BleDevice) {
    setSelectedId(device.id)
    Alert.alert(device.name, `Selected: ${device.name}\nAddress: ${device.id}`, [{ text: 'OK' }])
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={{ backgroundColor: card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: border }}>
        <Text style={{ fontSize: 12, color: textMuted, lineHeight: 18 }}>
          POS uses the <Text style={{ fontWeight: '700', color: text }}>device camera</Text> by default.
          For an external Bluetooth or WiFi barcode scanner, select it below.
        </Text>
      </View>

      <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 12 }}>Scanner Source</Text>
        <ScannerOption title="Phone Camera" description="Use the device camera to scan barcodes" active={!useBluetoothScanner} brand={brand} onPress={() => onBluetoothToggle(false)} />
        <View style={{ height: 1, backgroundColor: border, marginVertical: 8 }} />
        <ScannerOption title="External Scanner" description="Bluetooth or WiFi 2D barcode scanner" active={useBluetoothScanner} brand={brand} onPress={() => onBluetoothToggle(true)} />
      </View>

      {useBluetoothScanner && (
        <ScannerDevicePanel
          discovered={discovered}
          selectedId={selectedId}
          scanning={scanning}
          permissionDenied={permissionDenied}
          onScan={handleScan}
          onSelect={handleSelect}
        />
      )}
    </View>
  )
}
