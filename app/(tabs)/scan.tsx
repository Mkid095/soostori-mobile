// app/(tabs)/scan.tsx — Barcode scanner using expo-camera
import { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Package, Plus } from 'lucide-react-native'
import { BarcodeScannerModal } from '../../src/components/shared/barcode-scanner-modal'
import { getProductByBarcode } from '../../src/services/db-products'
import { formatCurrency } from '../../src/lib/formatters'
import { useTheme } from '../../src/hooks/useTheme'
import { AppHeader } from '../../src/components/shared/app-header'

export default function ScanScreen() {
  const { bg, card, text, textSecondary: textMuted, border, brand } = useTheme()
  const [showScanner, setShowScanner] = useState(true)
  const [lastScanned, setLastScanned] = useState<string | null>(null)

  const handleScan = useCallback(async (barcode: string) => {
    setLastScanned(barcode)
    const product = await getProductByBarcode(barcode)
    if (!product) {
      Alert.alert('Not Found', `No product with barcode "${barcode}"`)
    }
  }, [])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Scan" />
      <View style={{ flex: 1 }}>
        <BarcodeScannerModal
          visible={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleScan}
        />
      </View>

      {lastScanned && (
        <View style={{ padding: 16, backgroundColor: card, borderTopWidth: 1, borderTopColor: border }}>
          <Text style={{ color: textMuted, fontSize: 12 }}>Last scanned</Text>
          <Text style={{ color: text, fontWeight: '700', fontSize: 16, marginTop: 2 }}>{lastScanned}</Text>
        </View>
      )}

      <View style={{ padding: 16 }}>
        <TouchableOpacity
          style={{ backgroundColor: brand, paddingVertical: 16, borderRadius: 12, alignItems: 'center' }}
          onPress={() => setShowScanner(true)}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Open Scanner</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
