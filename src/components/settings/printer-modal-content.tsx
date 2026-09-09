// PrinterModalContent — printer settings in modal context
import { useState } from 'react'
import { View } from 'react-native'
import { PrinterSection } from './printer-section'

interface Props {
  onClose: () => void
}

export function PrinterModalContent({ onClose }: Props) {
  const [printerType, setPrinterType] = useState<'wifi' | 'bluetooth' | 'pdf'>('pdf')
  return <PrinterSection printerType={printerType} onPrinterTypeChange={setPrinterType} />
}
