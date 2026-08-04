// Edit product form — thin wrapper around the shared InventoryWizard
import { useState, useCallback } from 'react'
import { InventoryWizard } from './inventory-wizard'
import type { Product } from '../../lib/types'
import type { ProductType } from './inventory-types'

interface GroupPrice {
  name: string
  price: string
  minQuantity: string
}

interface Props {
  product: Product | null
  onClose: () => void
  onSaved: () => void
}

function makeInitForm(p: Product): Record<string, any> {
  return {
    productType: p.unitsPerPackage ? 'bulk' : 'loose',
    name: p.name,
    sku: p.sku || '',
    barcode: p.barcode || '',
    categoryId: p.categoryId || '',
    categoryName: p.categoryName || '',
    categoryColor: p.categoryColor || '#f97316',
    unit: p.unit || 'piece',
    costPrice: String(p.costPrice),
    sellingPrice: String(p.sellingPrice),
    allowSingleUnitSale: p.allowSingleUnitSale,
    unitsPerPackage: p.unitsPerPackage ? String(p.unitsPerPackage) : '',
    boxBuyingPrice: p.boxBuyingPrice ? String(p.boxBuyingPrice) : '',
    groupPrices: (p.groupPrices || []).map((gp) => ({
      name: gp.name, price: String(gp.price), minQuantity: String(gp.minQuantity),
    })),
    stockQuantity: String(p.stockQuantity),
    lowStockThreshold: String(p.lowStockThreshold),
    trackInventory: p.trackInventory,
    distributorName: p.distributorName || '',
    distributorPhone: p.distributorPhone || '',
  }
}

export function InventoryEditForm({ product, onClose, onSaved }: Props) {
  const [initialForm, setInitialForm] = useState<Record<string, any> | undefined>(undefined)

  const open = useCallback(() => {
    setInitialForm(product ? makeInitForm(product) : undefined)
  }, [product])

  async function handleSave(form: Record<string, any>) {
    if (!product) return
    const { updateProduct } = await import('../../services/db-products')
    const groupPricesParsed = (form.groupPrices as GroupPrice[])
      .filter((gp) => gp.price && gp.minQuantity)
      .map((gp) => ({
        name: gp.name || `${gp.minQuantity}+`,
        price: parseFloat(gp.price),
        minQuantity: parseInt(gp.minQuantity),
      }))

    await updateProduct(product.id, {
      name: form.name.trim(),
      sku: form.sku?.trim() || undefined,
      barcode: form.barcode?.trim() || undefined,
      categoryId: form.categoryId || undefined,
      categoryName: form.categoryName || undefined,
      categoryColor: form.categoryColor || undefined,
      unit: form.unit,
      costPrice: parseFloat(form.costPrice) || 0,
      sellingPrice: parseFloat(form.sellingPrice) || 0,
      allowSingleUnitSale: form.allowSingleUnitSale,
      unitsPerPackage: form.unitsPerPackage ? parseInt(form.unitsPerPackage) : undefined,
      boxBuyingPrice: form.boxBuyingPrice ? parseFloat(form.boxBuyingPrice) : undefined,
      groupPrices: groupPricesParsed.length ? groupPricesParsed : undefined,
      stockQuantity: parseInt(form.stockQuantity) || 0,
      lowStockThreshold: parseInt(form.lowStockThreshold) || 10,
      trackInventory: form.trackInventory,
      distributorName: form.distributorName?.trim() || undefined,
      distributorPhone: form.distributorPhone?.trim() || undefined,
    })
  }

  return (
    <InventoryWizard
      visible={!!product}
      onClose={onClose}
      onSaved={onSaved}
      isEdit={true}
      initialForm={product ? makeInitForm(product) : undefined}
      onSave={handleSave}
    />
  )
}
