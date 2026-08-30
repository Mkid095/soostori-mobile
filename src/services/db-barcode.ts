// Barcode generation service — creates valid barcodes for products
// Uses CODE128 format for broad scanner compatibility

/**
 * Generates a unique barcode value.
 * Format: SOO + timestamp (base36) + random (3 chars) = ~19 chars.
 * Scannable by all standard barcode readers.
 */
export function generateBarcode(): string {
  const prefix = 'SOO'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.floor(Math.random() * 1000).toString(36).toUpperCase().padStart(3, '0')
  return `${prefix}${timestamp}${random}`
}

/**
 * Validates a barcode string is non-empty and reasonable length.
 */
export function isValidBarcode(barcode: string | null | undefined): boolean {
  if (!barcode || typeof barcode !== 'string') return false
  const trimmed = barcode.trim()
  return trimmed.length >= 4 && trimmed.length <= 48
}

/**
 * Formats a barcode for display (adds spaces every 4 chars).
 */
export function formatBarcodeDisplay(barcode: string): string {
  return barcode.replace(/(.{4})/g, '$1 ').trim()
}
