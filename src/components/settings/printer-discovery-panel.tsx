// PrinterDiscoveryPanel — BLE/WiFi printer device list with scan button
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { Printer } from 'lucide-react-native'

export interface PanelDevice {
  id: string
  name: string
  subtitle: string
}

interface Props {
  title: string
  scanning: boolean
  devices: PanelDevice[]
  selectedId: string | null
  onScan: () => void
  onSelect: (id: string) => void
}

export function PrinterDiscoveryPanel({ title, scanning, devices, selectedId, onScan, onSelect }: Props) {
  const { card, text, textSecondary: textMuted, border, brand } = useTheme()

  return (
    <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: text }}>{title}</Text>
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

      {scanning && devices.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <ActivityIndicator color={brand} size="large" />
          <Text style={{ color: textMuted, fontSize: 13, marginTop: 8 }}>Searching for printers...</Text>
        </View>
      )}

      {!scanning && devices.length === 0 && (
        <Text style={{ fontSize: 13, color: textMuted, textAlign: 'center', paddingVertical: 8 }}>
          Tap Scan to search for {title} on your network.{'\n'}Make sure the printer is on and connected.
        </Text>
      )}

      <FlatList
        data={devices}
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
              onPress={() => onSelect(item.id)}
              activeOpacity={0.7}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: brand + '20', justifyContent: 'center', alignItems: 'center' }}>
                
                <Printer size={16} color={brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: text }}>{item.name}</Text>
                {item.subtitle ? <Text style={{ fontSize: 11, color: textMuted }}>{item.subtitle}</Text> : null}
              </View>
              {selected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: brand }} />}
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}
