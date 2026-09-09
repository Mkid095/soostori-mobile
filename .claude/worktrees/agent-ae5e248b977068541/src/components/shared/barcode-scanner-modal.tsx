import { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native'
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera'
import { X } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'

// Play beep sound when barcode is scanned. expo-av requires a dev build; silent fail in Expo Go.
async function playBeep() {
  try {
    // Dynamic import so expo-av is only loaded when native module is available
    const { Audio } = await import('expo-av')
    const { sound } = await Audio.Sound.createAsync(
      require('../../../assets/beep.mp3'),
      { shouldPlay: true, volume: 1.0 }
    )
    sound.setOnPlaybackStatusUpdate((status) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((status as any).didJustFinish) sound.unloadAsync()
    })
  } catch {
    // expo-av not available (Expo Go) — silent fail
  }
}

interface Props {
  visible: boolean
  onClose: () => void
  onScan: (barcode: string) => void
}

export function BarcodeScannerModal({ visible, onClose, onScan }: Props) {
  const { bg, text, brand } = useTheme()
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (scanned) return
    setScanned(true)
    await playBeep()
    onScan(result.data)
    onClose()
    setTimeout(() => setScanned(false), 1000)
  }

  if (!permission) {
    return (
      <Modal visible={visible} onRequestClose={onClose}>
        <View style={[styles.center, { backgroundColor: bg }]}>
          <Text style={{ color: text }}>Requesting camera permission...</Text>
        </View>
      </Modal>
    )
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} onRequestClose={onClose}>
        <View style={[styles.center, { backgroundColor: bg }]}>
          <Text style={[styles.message, { color: text }]}>Camera access is needed to scan barcodes</Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: brand }]} onPress={requestPermission}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { backgroundColor: '#64748b' }]} onPress={onClose}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    )
  }

  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        {/* Camera — rendered first so overlay can sit above it via absolute position */}
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code39', 'code128', 'codabar', 'itf14'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        />
        {/* Overlay — absolutely positioned above the camera */}
        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.scanArea}>
            <View style={[styles.corner, { borderColor: brand }, styles.topLeft]} />
            <View style={[styles.corner, { borderColor: brand }, styles.topRight]} />
            <View style={[styles.corner, { borderColor: brand }, styles.bottomLeft]} />
            <View style={[styles.corner, { borderColor: brand }, styles.bottomRight]} />
          </View>
          <Text style={styles.hint}>Point camera at barcode</Text>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  message: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  button: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 12 },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  topBar: { paddingTop: 60, paddingHorizontal: 20 },
  closeBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  scanArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  corner: { position: 'absolute', width: 30, height: 30, borderWidth: 3 },
  topLeft: { top: '30%', left: '15%', borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: '30%', right: '15%', borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: '30%', left: '15%', borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: '30%', right: '15%', borderLeftWidth: 0, borderTopWidth: 0 },
  hint: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 20 },
})
