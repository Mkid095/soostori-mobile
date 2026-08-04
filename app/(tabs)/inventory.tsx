// app/(tabs)/inventory.tsx — Inventory management screen
import { useState, useEffect, useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../../src/hooks/useTheme'
import type { Product, Category } from '../../src/lib/types'
import { getAllProducts, deleteProduct } from '../../src/services/db-products'
import { getAllCategories } from '../../src/services/db-categories'
import { InventorySearchBar } from '../../src/components/inventory/inventory-search-bar'
import { InventoryProductList } from '../../src/components/inventory/inventory-product-list'
import { InventoryAddForm } from '../../src/components/inventory/inventory-add-form'
import { InventoryEditForm } from '../../src/components/inventory/inventory-edit-form'
import { RestockPanel } from '../../src/components/inventory/restock-panel'
import { AppHeader } from '../../src/components/shared/app-header'
import { ConfirmModal } from '../../src/components/shared/confirm-modal'

export default function InventoryScreen() {
  const theme = useTheme()
  const { bg, card, text, textSecondary: muted, border, brand: orange } = theme

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [restocking, setRestocking] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)

  const loadProducts = useCallback(async () => setProducts(await getAllProducts()), [])
  const loadCategories = useCallback(async () => setCategories(await getAllCategories()), [])

  useEffect(() => { loadProducts(); loadCategories() }, [loadProducts, loadCategories])

  const handleDelete = async () => {
    if (!deletingProduct) return
    await deleteProduct(deletingProduct.id)
    loadProducts()
    setDeletingProduct(null)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Inventory" />
      <InventorySearchBar
        searchQuery={searchQuery}
        categories={categories}
        selectedCategory={selectedCategory}
        orange={orange}
        muted={muted}
        bg={bg}
        text={text}
        border={border}
        onSearch={setSearchQuery}
        onSelectCategory={setSelectedCategory}
        onAdd={() => setShowAdd(true)}
      />
      {restocking && (
        <RestockPanel
          product={restocking}
          onClose={() => setRestocking(null)}
          onDone={() => { loadProducts(); setRestocking(null) }}
        />
      )}
      <InventoryProductList
        products={products}
        theme={theme}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        onEdit={setEditing}
        onRestock={setRestocking}
        onDelete={setDeletingProduct}
      />
      <InventoryAddForm visible={showAdd} onClose={() => setShowAdd(false)} onSaved={() => { loadProducts(); setShowAdd(false) }} />
      <InventoryEditForm product={editing} onClose={() => setEditing(null)} onSaved={() => { loadProducts(); setEditing(null) }} />
      <ConfirmModal
        visible={!!deletingProduct}
        title="Delete Product"
        message={`Are you sure you want to delete "${deletingProduct?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeletingProduct(null)}
        onConfirm={handleDelete}
      />
    </SafeAreaView>
  )
}
