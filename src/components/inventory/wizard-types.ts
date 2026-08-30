// Shared types and factory for inventory wizard form state
import type { ProductType } from './inventory-types'
import type { VariantRow } from './step-variations'

export interface GroupPrice {
  name: string; price: string; minQuantity: string
}

export interface ProductForm {
  productType: ProductType
  name: string
  sku: string
  barcode: string
  categoryId: string
  categoryName: string
  categoryColor: string
  unit: string
  costPrice: string
  sellingPrice: string
  allowSingleUnitSale: boolean
  unitsPerPackage: string
  boxBuyingPrice: string
  groupPrices: GroupPrice[]
  stockQuantity: string
  lowStockThreshold: string
  trackInventory: boolean
  distributorName: string
  distributorPhone: string
}

export interface WizardProps {
  visible: boolean
  onClose: () => void
  onSaved: () => void
  isEdit?: boolean
  initialForm?: Partial<ProductForm>
  onSave: (form: ProductForm, variants: VariantRow[]) => Promise<void>
}

export function makeInit(): ProductForm {
  return {
    productType: 'loose',
    name: '',
    sku: '',
    barcode: '',
    categoryId: '',
    categoryName: '',
    categoryColor: '#f97316',
    unit: 'piece',
    costPrice: '',
    sellingPrice: '',
    allowSingleUnitSale: true,
    unitsPerPackage: '',
    boxBuyingPrice: '',
    groupPrices: [],
    stockQuantity: '',
    lowStockThreshold: '10',
    trackInventory: true,
    distributorName: '',
    distributorPhone: '',
  }
}
