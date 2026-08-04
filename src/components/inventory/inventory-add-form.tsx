// Add product form — thin wrapper around the shared InventoryWizard
import { InventoryWizard } from './inventory-wizard'
import type { ProductType } from './inventory-types'

interface GroupPrice {
  name: string
  price: string
  minQuantity: string
}

interface Props {
  visible: boolean
  onClose: () => void
  onSaved: () => void
}

export function InventoryAddForm({ visible, onClose, onSaved }: Props) {
  async function handleSave(form: Record<string, any>) {
    const { createProduct } = await import('../../services/db-products')
    const groupPricesParsed = (form.groupPrices as GroupPrice[])
      .filter((gp) => gp.price && gp.minQuantity)
      .map((gp) => ({
        name: gp.name || `${gp.minQuantity}+`,
        price: parseFloat(gp.price),
        minQuantity: parseInt(gp.minQuantity),
      }))

    await createProduct({
      name: form.name.trim(),
      sku: form.sku?.trim() || undefined,
      barcode: form.barcode?.trim() || undefined,
      categoryId: form.categoryId || undefined,
      categoryName: form.categoryName || undefined,
      categoryColor: form.categoryColor || undefined,
      unit: form.unit || 'piece',
      costPrice: parseFloat(form.costPrice) || 0,
      sellingPrice: parseFloat(form.sellingPrice) || 0,
      allowSingleUnitSale: form.allowSingleUnitSale ?? true,
      unitsPerPackage: form.unitsPerPackage ? parseInt(form.unitsPerPackage) : undefined,
      boxBuyingPrice: form.boxBuyingPrice ? parseFloat(form.boxBuyingPrice) : undefined,
      groupPrices: groupPricesParsed.length ? groupPricesParsed : undefined,
      stockQuantity: parseInt(form.stockQuantity) || 0,
      lowStockThreshold: parseInt(form.lowStockThreshold) || 10,
      trackInventory: form.trackInventory ?? true,
      distributorName: form.distributorName?.trim() || undefined,
      distributorPhone: form.distributorPhone?.trim() || undefined,
      isActive: true,
    })
  }

  return (
    <InventoryWizard
      visible={visible}
      onClose={onClose}
      onSaved={onSaved}
      isEdit={false}
      onSave={handleSave}
    />
  )
}
