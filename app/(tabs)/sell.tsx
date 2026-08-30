// app/(tabs)/sell.tsx — Fast POS grid with large touch targets
// Replaces the existing pos.tsx for role-based mobile tabs
import { useState, useEffect, useCallback } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Package, Camera, X, ShoppingCart, Wifi, WifiOff } from 'lucide-react-native'
import type { Product, CartItem, Category, ShopSettings, ProductVariant } from '../../src/lib/types'
import { getAllProducts, searchProducts, getProductByBarcode } from '../../src/services/db-products'
import { getAllCategories } from '../../src/services/db-categories'
import { holdSale } from '../../src/services/db-sales'
import { getShopSettings } from '../../src/services/db-settings'
import { getVariantsByProductId } from '../../src/services/db-product-variants'
import { formatCurrency } from '../../src/lib/formatters'
import { PosCheckoutModal } from '../../src/components/pos/pos-checkout-modal'
import { CategoryChips } from '../../src/components/pos/category-chips'
import { BarcodeScannerModal } from '../../src/components/shared/barcode-scanner-modal'
import { CartBar } from '../../src/components/pos/pos-cart-bar'
import { PriceSelectionDialog } from '../../src/components/pos/price-selection-dialog'
import { VariantPickerModal } from '../../src/components/pos/variant-picker-modal'
import { AppHeader } from '../../src/components/shared/app-header'
import { useTheme } from '../../src/hooks/useTheme'
import { useLanSync } from '../../src/hooks/useLanSync'

export default function SellScreen() {
  const { bg, card, text, textSecondary: textMuted, border, brand: orange } = useTheme()

  const { isConnected, isHostAvailable, connectionState } = useLanSync({ shopId: 'default', deviceId: '' })

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCheckout, setShowCheckout] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [priceProduct, setPriceProduct] = useState<Product | null>(null)
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null)
  const [variantProduct, setVariantProduct] = useState<Product | null>(null)
  const [variantPickerVisible, setVariantPickerVisible] = useState(false)
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([])

  const loadProducts = useCallback(async () => {
    setProducts(searchQuery ? await searchProducts(searchQuery) : await getAllProducts())
  }, [searchQuery])

  const loadCategories = useCallback(async () => setCategories(await getAllCategories()), [])

  useEffect(() => {
    loadProducts()
    loadCategories()
    getShopSettings().then(setShopSettings)
  }, [loadProducts, loadCategories])

  const visibleProducts = selectedCategory === 'all'
    ? products
    : products.filter((p) => p.categoryId === selectedCategory)

  const cartTotal = cart.reduce((s, i) => s + i.totalPrice, 0)

  function addToCartWithPrice(unitPrice: number, quantity: number, product: Product, variationName?: string) {
    setCart((prev) => {
      const matchKey = variationName ? `${product.id}|${variationName}` : product.id
      const existing = prev.find((c) => (variationName ? `${c.productId}|${c.variationName}` : c.productId) === matchKey)
      if (existing) {
        const newQty = existing.quantity + quantity
        return prev.map((c) => (variationName ? `${c.productId}|${c.variationName}` : c.productId) === matchKey
          ? { ...c, quantity: newQty, unitPrice, totalPrice: newQty * unitPrice } : c)
      }
      return [...prev, { productId: product.id, productName: product.name, quantity, unitPrice, totalPrice: unitPrice * quantity, discount: 0, variationName }]
    })
  }

  async function addToCart(product: Product) {
    if (product.groupPrices && product.groupPrices.length > 0) { setPriceProduct(product); return }
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

  async function handleHoldSale() {
    if (cart.length === 0) return
    await holdSale(cart)
    setCart([])
    Alert.alert('Held', 'Sale saved')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Sell" />
      {connectionState !== 'disconnected' && (
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          paddingVertical: 6, paddingHorizontal: 12, gap: 6,
          backgroundColor: isHostAvailable ? '#dcfce7' : '#fef9c3',
        }}>
          {isHostAvailable
            ? <Wifi size={14} color="#16a34a" />
            : <WifiOff size={14} color="#ca8a04" />
          }
          <Text style={{
            fontSize: 12,
            color: isHostAvailable ? '#16a34a' : '#ca8a04',
          }}>
            {isHostAvailable
              ? `LAN connected`
              : connectionState === 'reconnecting'
                ? 'Reconnecting to host...'
                : 'Host unavailable — offline mode'
            }
          </Text>
        </View>
      )}
      <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: card, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: bg, borderRadius: 10, paddingHorizontal: 14 }}>
            <TextInput
              style={{ flex: 1, paddingVertical: 10, fontSize: 15, color: text }}
              placeholder="Search products..."
              placeholderTextColor={textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
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
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              flex: 1, backgroundColor: card, borderRadius: 12, padding: 10, borderWidth: 1,
              borderColor: border, marginBottom: 8, minHeight: 90, justifyContent: 'center',
              opacity: item.trackInventory && item.stockQuantity <= 0 ? 0.5 : 1,
            }}
            onPress={() => item.trackInventory && item.stockQuantity <= 0 ? null : addToCart(item)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: text, textAlign: 'center' }} numberOfLines={2}>{item.name}</Text>
            <Text style={{ fontSize: 12, color: orange, fontWeight: '800', textAlign: 'center', marginTop: 4 }}>{formatCurrency(item.sellingPrice)}</Text>
            {item.trackInventory && item.stockQuantity <= 0 ? (
              <Text style={{ fontSize: 10, color: '#ef4444', fontWeight: '700', textAlign: 'center' }}>Out of stock</Text>
            ) : item.trackInventory ? (
              <Text style={{ fontSize: 10, color: textMuted, textAlign: 'center' }}>{item.stockQuantity} left</Text>
            ) : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Package size={48} color={textMuted} />
            <Text style={{ color: textMuted, fontSize: 15, marginTop: 8 }}>No products found</Text>
          </View>
        }
      />

      {cart.length > 0 && (
        <CartBar cart={cart} cartTotal={cartTotal} onHold={handleHoldSale} onRecall={() => {}}
          onClear={() => setCart([])} onCheckout={() => setShowCheckout(true)}
          isDark={false} text={text} textMuted={textMuted} border={border} orange={orange} card={card}
        />
      )}

      <PosCheckoutModal
        visible={showCheckout} cart={cart} products={products} shopSettings={shopSettings}
        onClose={() => setShowCheckout(false)} onComplete={() => { setShowCheckout(false); setCart([]) }}
        onUpdateCart={setCart}
      />

      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={async (barcode) => {
          const product = await getProductByBarcode(barcode)
          if (product) addToCart(product)
          else Alert.alert('Not Found', `No product with barcode "${barcode}"`)
        }}
      />

      {priceProduct && (
        <PriceSelectionDialog
          product={priceProduct}
          onSelect={(unitPrice, quantity) => { addToCartWithPrice(unitPrice, quantity, priceProduct); setPriceProduct(null) }}
          onCancel={() => setPriceProduct(null)}
        />
      )}

      {variantProduct && (
        <VariantPickerModal
          visible={variantPickerVisible}
          productName={variantProduct.name}
          variants={productVariants}
          onSelect={handleVariantSelect}
          onClose={() => { setVariantPickerVisible(false); setVariantProduct(null) }}
        />
      )}
    </SafeAreaView>
  )
}
