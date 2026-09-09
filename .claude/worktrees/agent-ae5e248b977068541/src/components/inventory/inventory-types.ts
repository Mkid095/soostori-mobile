// Shared types for inventory wizard

export type ProductType = 'loose' | 'bulk'

export type StockReason = 'Restock' | 'Adjustment' | 'Return' | 'Other'

export const UNIT_OPTIONS = [
  'piece', 'pack', 'box', 'carton', 'dozen', 'pair', 'set',
  'roll', 'bundle', 'crate', 'tray', 'sachet', 'tube', 'bottle',
  'can', 'bag', 'packet', 'loaf',
] as const

export type UnitOption = typeof UNIT_OPTIONS[number]

export const STOCK_REASONS: StockReason[] = ['Restock', 'Adjustment', 'Return', 'Other']
