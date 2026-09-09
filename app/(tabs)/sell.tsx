// app/(tabs)/sell.tsx — Fast POS grid with large touch targets
// Replaces the existing pos.tsx for role-based mobile tabs
import { useState, useEffect } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Package, Camera, X, Wifi, WifiOff } from 'lucide-react-native'
import type { Product, ShopSettings, ProductVariant } from '../../src/lib/types'
import { getShopSettings } from '../../src/services/db-settings'
import { PosCheckoutModal } from '../../src/components/pos/pos-checkout-modal'
import { CategoryChips } from '../../src/components/pos/category-chips'
import { BarcodeScannerModal } from '../../src/components/shared/barcode-scanner-modal'
import { CartBar } from '../../src/components/pos/pos-cart-bar'
import { PriceSelectionDialog } from '../../src/components/pos/price-selection-dialog'
import { VariantPickerModal } from '../../src/components/pos/variant-picker-modal'
import { ProductGridItem } from '../../src/components/pos/product-grid-item'
import { AppHeader } from '../../src/components/shared/app-header'
import { useTheme } from '../../src/hooks/useTheme'
import { useLanSync } from '../../src/hooks/useLanSync'
import { useProducts } from '../../src/hooks/useProducts'
import { useCart } from '../../src/hooks/useCart'

export default function SellScreen() {
  const { bg, card, text, textSecondary: textMuted, border, brand: orange } = useTheme()
  const { isHostAvailable, connectionState } = useLanSync({ shopId: 'default', deviceId: '' })

  const [searchQuery, setSearchQuery] = useState('')
  const { data: allProducts = [] } = useProducts()
  const { data: searchedProducts = [] } = useProducts(searchQuery)
  const [categories, setCategories] = useState<import('../../src/lib/types').Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showCheckout, setShowCheckout] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
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
    if (product.groupPrices && product.groupPrices.length > 0) { setPriceProduct(product); return }
    const { getVariantsByProductId } = await import('../../src/services/db-product-variants')
    const variants = await getVariantsByProductId(product.id)
    if (variants.length > 0) {
      setVariantProduct(product)
      setProductVariants(variants)
      setVariantPickerVisible(true)
      return
    }
    addToCartWithPrice(product.sellingPrice, 1, product)
  }

  function handleVariantSelect(variant: ProductVariant) {
    if (!variantProduct) return
    addToCartWithPrice(variant.sellingPrice ?? variantProduct.sellingPrice, 1, variantProduct, variant.name)
    setVariantPickerVisible(false)
    setVariantProduct(null)
    setProductVariants([])
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Sell" />
      {connectionState !== 'disconnected' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 12, gap: 6, backgroundColor: isHostAvailable ? '#dcfce7' : '#fef9c3' }}>
          {isHostAvailable ? <Wifi size={14} color="#16a34a" /> : <WifiOff size={14} color="#ca8a04" />}
          <Text style={{ fontSize: 12, color: isHostAvailable ? '#16a34a' : '#ca8a04' }}>
            {isHostAvailable ? 'LAN connected' : connectionState === 'reconnecting' ? 'Reconnecting to host...' : 'Host unavailable — offline mode'}
          </Text>
        </View>
      )}
      <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: card, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: bg, borderRadius: 10, paddingHorizontal: 14 }}>
            <TextInput
              style={{ flex: 1, paddingVertical: 10, fontSize: 15, color: text }}
              placeholder="Search products..." placeholderTextColor={textMuted}
              value={searchQuery} onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}><X size={16} color={textMuted} /></TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: orange, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => setShowScanner(true)}
          >
            <Camera size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <CategoryChips categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} orange={orange} />
      </View>

      <FlatList
        data={visibleProducts}
        numColumns={3}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 8, paddingBottom: 148 }}
        columnWrapperStyle={{ gap: 8 }}
        renderItem={({ item }) => <ProductGridItem product={item} onAddToCart={addToCart} orange={orange} />}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Package size={48} color={textMuted} />
            <Text style={{ color: textMuted, fontSize: 15, marginTop: 8 }}>No products found</Text>
          </View>
        }
      />

      {cart.length > 0 && (
        <CartBar cart={cart} cartTotal={cartTotal} onHold={handleHoldSale} onRecall={() => {}} onClear={clearCart} onCheckout={() => setShowCheckout(true)} isDark={false} text={text} textMuted={textMuted} border={border} orange={orange} card={card} />
      )}

      <PosCheckoutModal visible={showCheckout} cart={cart} products={products} shopSettings={shopSettings} onClose={() => setShowCheckout(false)} onComplete={() => { setShowCheckout(false); clearCart() }} onUpdateCart={updateCart} />

      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={async (barcode) => {
          const { getProductByBarcode } = await import('../../src/services/db-products')
          const product = await getProductByBarcode(barcode)
          if (product) addToCart(product)
          else Alert.alert('Not Found', `No product with barcode "${barcode}"`)
        }}
      />

      {priceProduct && (
        <PriceSelectionDialog product={priceProduct} onSelect={(unitPrice, quantity) => { addToCartWithPrice(unitPrice, quantity, priceProduct); setPriceProduct(null) }} onCancel={() => setPriceProduct(null)} />
      )}

      {variantProduct && (
        <VariantPickerModal visible={variantPickerVisible} productName={variantProduct.name} variants={productVariants} onSelect={handleVariantSelect} onClose={() => { setVariantPickerVisible(false); setVariantProduct(null) }} />
      )}
    </SafeAreaView>
  )
}
