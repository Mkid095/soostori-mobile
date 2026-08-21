// ScannerDevicePanel — BLE scanner discovery list with scan button
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { Bluetooth } from 'lucide-react-native'
import type { BleDevice } from '../../services/device-discovery'

interface Props {
  discovered: BleDevice[]
  selectedId: string | null
  scanning: boolean
  permissionDenied: boolean
  onScan: () => void
  onSelect: (device: BleDevice) => void
}

export function ScannerDevicePanel({ discovered, selectedId, scanning, permissionDenied, onScan, onSelect }: Props) {
  const { card, text, textSecondary: textMuted, border, brand, danger } = useTheme()

  return (
    <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: text }}>Available Scanners</Text>
        <TouchableOpacity
          style={{ backgroundColor: brand, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          onPress={onScan} disabled={scanning}
        >
          {scanning
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Scan</Text>
          }
        </TouchableOpacity>
      </View>

      {permissionDenied && (
        <Text style={{ fontSize: 12, color: danger, marginBottom: 8 }}>
          Bluetooth permission denied. Enable it in system settings.
        </Text>
      )}

      {scanning && discovered.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <ActivityIndicator color={brand} size="large" />
          <Text style={{ color: textMuted, fontSize: 13, marginTop: 8 }}>Scanning for Bluetooth scanners...</Text>
        </View>
      )}

      {!scanning && discovered.length === 0 && (
        <Text style={{ fontSize: 13, color: textMuted, textAlign: 'center', paddingVertical: 8 }}>
          Tap Scan to search for Bluetooth scanners nearby.{'\n'}Make sure the scanner is on and in pairing mode.
        </Text>
      )}

      <FlatList
        data={discovered}
        keyExtractor={d => d.id}
        scrollEnabled={false}
        style={{ maxHeight: 180 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => {
          const selected = item.id === selectedId
          return (
            <TouchableOpacity
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: selected ? brand + '15' : 'transparent',
                borderRadius: 10, padding: 12,
                borderWidth: 1.5, borderColor: selected ? brand : border,
              }}
              onPress={() => onSelect(item)}
              activeOpacity={0.7}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: brand + '20', justifyContent: 'center', alignItems: 'center' }}>
    // @ts-expect-error
                <Bluetooth size={16} color={brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: text }}>{item.name}</Text>
                {item.rssi !== undefined && (
                  <Text style={{ fontSize: 11, color: textMuted }}>Signal: {item.rssi} dBm</Text>
                )}
              </View>
              {selected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: brand }} />}
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={null}
      />
    </View>
  )
}
