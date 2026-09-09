// Add product form — thin wrapper around the shared InventoryWizard
import { InventoryWizard } from './inventory-wizard'
import type { VariantRow } from './step-variations'
import type { ProductForm } from './wizard-types'
import type { Product } from '../../lib/types'

interface Props {
  visible: boolean
  onClose: () => void
  onSaved: () => void
  onSelectSuggestion?: (product: Product) => void
}

export function InventoryAddForm({ visible, onClose, onSaved, onSelectSuggestion }: Props) {
  async function handleSave(form: ProductForm, variants: VariantRow[] = []) {
    const { createProduct } = await import('../../services/db-products')
    const { createVariant } = await import('../../services/db-product-variants')

    const groupPricesParsed = form.groupPrices
      .filter((gp) => gp.price && gp.minQuantity)
      .map((gp) => ({
        name: gp.name || `${gp.minQuantity}+`,
        price: parseFloat(gp.price),
        minQuantity: parseInt(gp.minQuantity),
      }))

    const product = await createProduct({
      name: String(form.name).trim(),
      sku: form.sku ? String(form.sku).trim() : undefined,
      barcode: form.barcode ? String(form.barcode).trim() : undefined,
      categoryId: form.categoryId ? String(form.categoryId) : undefined,
      categoryName: form.categoryName ? String(form.categoryName) : undefined,
      categoryColor: form.categoryColor ? String(form.categoryColor) : undefined,
      unit: form.unit ? String(form.unit) : 'piece',
      costPrice: parseFloat(String(form.costPrice)) || 0,
      sellingPrice: parseFloat(String(form.sellingPrice)) || 0,
      allowSingleUnitSale: Boolean(form.allowSingleUnitSale),
      unitsPerPackage: form.unitsPerPackage ? parseInt(String(form.unitsPerPackage)) : undefined,
      boxBuyingPrice: form.boxBuyingPrice ? parseFloat(String(form.boxBuyingPrice)) : undefined,
      groupPrices: groupPricesParsed.length ? groupPricesParsed : undefined,
      stockQuantity: parseInt(String(form.stockQuantity)) || 0,
      lowStockThreshold: parseInt(String(form.lowStockThreshold)) || 10,
      trackInventory: Boolean(form.trackInventory),
      distributorName: form.distributorName ? String(form.distributorName).trim() : undefined,
      distributorPhone: form.distributorPhone ? String(form.distributorPhone).trim() : undefined,
      isActive: true,
    })

    // Save variants that have at least a name
    const validVariants = (variants || []).filter((v) => v.name.trim())
    for (const v of validVariants) {
      await createVariant({
        productId: product.id,
        name: v.name.trim(),
        sku: v.sku?.trim() || undefined,
        barcode: v.barcode?.trim() || undefined,
        costPrice: v.costPrice ? parseFloat(v.costPrice) : undefined,
        sellingPrice: v.sellingPrice ? parseFloat(v.sellingPrice) : parseFloat(String(form.sellingPrice)) || 0,
        stockQuantity: parseInt(v.stockQuantity) || 0,
        isActive: true,
      })
    }
  }

  return (
    <InventoryWizard
      visible={visible}
      onClose={onClose}
      onSaved={onSaved}
      isEdit={false}
      onSave={handleSave}
      onSelectSuggestion={onSelectSuggestion}
    />
  )
}
