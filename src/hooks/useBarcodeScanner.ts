// useBarcodeScanner.ts — Barcode scan mode state management
import { useState } from 'react'

export type BarcodeMode = 'scan' | 'manual' | 'generate'

export function useBarcodeScanner(initialMode: BarcodeMode = 'generate') {
  const [mode, setMode] = useState<BarcodeMode>(initialMode)

  function selectMode(m: BarcodeMode) {
    setMode(m)
  }

  return { mode, selectMode }
}
