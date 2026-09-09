// app/(tabs)/pos.tsx — Point of Sale screen
import { useState, useEffect } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Package, Camera, X, ShoppingCart } from 'lucide-react-native'
import type { Product, ShopSettings, HeldSale, ProductVariant } from '../../src/lib/types'
import { getShopSettings } from '../../src/services/db-settings'
import { PosCheckoutModal } from '../../src/components/pos/pos-checkout-modal'
import { CategoryChips } from '../../src/components/pos/category-chips'
import { BarcodeScannerModal } from '../../src/components/shared/barcode-scanner-modal'
import { CartBar } from '../../src/components/pos/pos-cart-bar'
import { HeldSalesSheet } from '../../src/components/pos/held-sales-sheet'
import { PriceSelectionDialog } from '../../src/components/pos/price-selection-dialog'
import { VariantPickerModal } from '../../src/components/pos/variant-picker-modal'
import { ProductGridItem } from '../../src/components/pos/product-grid-item'
import { AppHeader } from '../../src/components/shared/app-header'
import { useTheme } from '../../src/hooks/useTheme'
import { useProducts } from '../../src/hooks/useProducts'
import { useCart } from '../../src/hooks/useCart'
import { formatCurrency } from '../../src/lib/formatters'

export default function POSScreen() {
  const { bg, card, text, textSecondary: textMuted, border, brand: orange, isDark } = useTheme()
  const { data: allProducts = [] } = useProducts()
  const [searchQuery, setSearchQuery] = useState('')
  const { data: searchedProducts = [] } = useProducts(searchQuery)
  const [categories, setCategories] = useState<import('../../src/lib/types').Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showCheckout, setShowCheckout] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showHeld, setShowHeld] = useState(false)
  const [priceProduct, setPriceProduct] = useState<Product | null>(null)
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null)
  const [variantProduct, setVariantProduct] = useState<Product | null>(null)
  const [variantPickerVisible, setVariantPickerVisible] = useState(false)
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([])
  const { cart, cartTotal, addToCartWithPrice, clearCart, updateCart, handleHoldSale } = useCart()

  const products = searchQuery.trim() ? searchedProducts : allProducts
  const visibleProducts = selectedCategory === 'all' ? products : products.filter((p) => p.categoryId === selectedCategory)

  useEffect(() => {
    getShopSettings().then(setShopSettings)
    ;(async () => {
      const { getAllCategories } = await import('../../src/services/db-categories')
      setCategories(await getAllCategories())
    })()
  }, [])

  async function addToCart(product: Product) {
    if (product.groupPrices?.length) { setPriceProduct(product); return }
    const { getVariantsByProductId } = await import('../../src/services/db-product-variants')
    const variants = await getVariantsByProductId(product.id)
    if (variants.length) { setVariantProduct(product); setProductVariants(variants); setVariantPickerVisible(true); return }
    addToCartWithPrice(product.sellingPrice, 1, product)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Point of Sale" />
      <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: card, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: bg, borderRadius: 10, paddingHorizontal: 14 }}>
            <TextInput style={{ flex: 1, paddingVertical: 10, fontSize: 15, color: text }} placeholder="Search products..." placeholderTextColor={textMuted} value={searchQuery} onChangeText={setSearchQuery} />
            {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><X size={16} color={textMuted} /></TouchableOpacity>}
          </View>
          <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: orange, justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowScanner(true)}>
            <Camera size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <CategoryChips categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} orange={orange} />
      </View>

      <FlatList data={visibleProducts} numColumns={3} keyExtractor={(item) => item.id} contentContainerStyle={{ padding: 8, paddingBottom: 148 }} columnWrapperStyle={{ gap: 8 }}
        renderItem={({ item }) => <ProductGridItem product={item} onAddToCart={addToCart} orange={orange} />}
        ListEmptyComponent={<View style={{ padding: 40, alignItems: 'center' }}><Package size={48} color={textMuted} /><Text style={{ color: textMuted, fontSize: 15, marginTop: 8 }}>No products found</Text><Text style={{ color: textMuted, fontSize: 12, marginTop: 4 }}>Add products in Inventory</Text></View>}
      />

      {cart.length > 0 && (
        <CartBar cart={cart} cartTotal={cartTotal} onHold={handleHoldSale} onRecall={() => setShowHeld(true)} onClear={clearCart} onCheckout={() => setShowCheckout(true)} isDark={isDark} text={text} textMuted={textMuted} border={border} orange={orange} card={card} />
      )}

      {cart.length > 0 && (
        <TouchableOpacity style={{ position: 'absolute', right: 12, top: '50%', transform: [{ translateY: -28 }], backgroundColor: orange, borderRadius: 28, width: 56, height: 56, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 }} onPress={() => setShowCheckout(true)} activeOpacity={0.8}>
          <View style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1.5, borderColor: orange }}>
            <Text style={{ color: orange, fontSize: 10, fontWeight: '800' }}>{cart.reduce((s, i) => s + i.quantity, 0)}</Text>
          </View>
          <ShoppingCart size={22} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800', marginTop: 1 }}>{formatCurrency(cartTotal)}</Text>
        </TouchableOpacity>
      )}

      <PosCheckoutModal visible={showCheckout} cart={cart} products={products} shopSettings={shopSettings} onClose={() => setShowCheckout(false)} onComplete={() => { setShowCheckout(false); clearCart() }} onUpdateCart={updateCart} />
      <BarcodeScannerModal visible={showScanner} onClose={() => setShowScanner(false)} onScan={async (barcode) => { const { getProductByBarcode } = await import('../../src/services/db-products'); const p = await getProductByBarcode(barcode); p ? addToCart(p) : Alert.alert('Not Found', `No product with barcode "${barcode}"`) }} />
      <HeldSalesSheet visible={showHeld} onRecall={(sale) => { updateCart(sale.cartItems.map(i => ({ ...i }))); setShowHeld(false) }} onClose={() => setShowHeld(false)} />
      {priceProduct && <PriceSelectionDialog product={priceProduct} onSelect={(u, q) => { addToCartWithPrice(u, q, priceProduct); setPriceProduct(null) }} onCancel={() => setPriceProduct(null)} />}
      {variantProduct && <VariantPickerModal visible={variantPickerVisible} productName={variantProduct.name} variants={productVariants} onSelect={(v) => { addToCartWithPrice(v.sellingPrice ?? variantProduct.sellingPrice, 1, variantProduct, v.name); setVariantPickerVisible(false); setVariantProduct(null); setProductVariants([]) }} onClose={() => { setVariantPickerVisible(false); setVariantProduct(null) }} />}
    </SafeAreaView>
  )
}
