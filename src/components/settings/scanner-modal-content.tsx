// ScannerModalContent — scanner settings in modal context
import { useState } from 'react'
import { View } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { ScannerSection } from './scanner-section'

interface Props {
  onClose: () => void
}

export function ScannerModalContent({ onClose }: Props) {
  const { card, text, textSecondary, border } = useTheme()
  const [useBluetooth, setUseBluetooth] = useState(false)
  return <ScannerSection useBluetoothScanner={useBluetooth} onBluetoothToggle={setUseBluetooth} />
}
