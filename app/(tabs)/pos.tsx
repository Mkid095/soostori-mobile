import { useState, useEffect, useCallback } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Package, Camera, X, ShoppingCart } from 'lucide-react-native'
import type { Product, CartItem, Category, ShopSettings, HeldSale } from '../../src/lib/types'
import { getAllProducts, searchProducts, getProductByBarcode } from '../../src/services/db-products'
import { getAllCategories } from '../../src/services/db-categories'
import { holdSale } from '../../src/services/db-sales'
import { getShopSettings } from '../../src/services/db-settings'
import { formatCurrency } from '../../src/lib/formatters'
import { PosCheckoutModal } from '../../src/components/pos/pos-checkout-modal'
import { CategoryChips } from '../../src/components/pos/category-chips'
import { BarcodeScannerModal } from '../../src/components/shared/barcode-scanner-modal'
import { CartBar } from '../../src/components/pos/pos-cart-bar'
import { HeldSalesSheet } from '../../src/components/pos/held-sales-sheet'
import { PriceSelectionDialog } from '../../src/components/pos/price-selection-dialog'
import { AppHeader } from '../../src/components/shared/app-header'
import { useTheme } from '../../src/hooks/useTheme'

export default function POSScreen() {
  const { bg, card, text, textSecondary: textMuted, border, brand: orange, isDark } = useTheme()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCheckout, setShowCheckout] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showHeld, setShowHeld] = useState(false)
  const [priceProduct, setPriceProduct] = useState<Product | null>(null)
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null)

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

  function addToCartWithPrice(unitPrice: number, quantity: number, product: Product) {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id)
      if (existing) {
        const newQty = existing.quantity + quantity
        const newTotal = newQty * unitPrice
        return prev.map((c) => c.productId === product.id
          ? { ...c, quantity: newQty, unitPrice, totalPrice: newTotal } : c)
      }
      return [...prev, {
        productId: product.id, productName: product.name, quantity,
        unitPrice, totalPrice: unitPrice * quantity, discount: 0,
      }]
    })
  }

  function addToCart(product: Product) {
    if (product.groupPrices && product.groupPrices.length > 0) {
      setPriceProduct(product)
      return
    }
    addToCartWithPrice(product.sellingPrice, 1, product)
  }

  function handleRecall(sale: HeldSale) {
    setCart(sale.cartItems.map((item) => ({ ...item })))
  }

  async function handleHoldSale() {
    if (cart.length === 0) return
    await holdSale(cart)
    setCart([])
    Alert.alert('Held', 'Sale saved to held sales')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Point of Sale" />
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
            <Text style={{ fontSize: 13, fontWeight: '700', color: text, textAlign: 'center' }} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={{ fontSize: 12, color: orange, fontWeight: '800', textAlign: 'center', marginTop: 4 }}>
              {formatCurrency(item.sellingPrice)}
            </Text>
            {item.trackInventory && item.stockQuantity <= 0 ? (
              <Text style={{ fontSize: 10, color: '#ef4444', fontWeight: '700', textAlign: 'center' }}>
                Out of stock
              </Text>
            ) : item.trackInventory ? (
              <Text style={{ fontSize: 10, color: textMuted, textAlign: 'center' }}>
                {item.stockQuantity} left
              </Text>
            ) : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>

            <Package size={48} color={textMuted} />
            <Text style={{ color: textMuted, fontSize: 15, marginTop: 8 }}>No products found</Text>
            <Text style={{ color: textMuted, fontSize: 12, marginTop: 4 }}>Add products in Inventory</Text>
          </View>
        }
      />

      {cart.length > 0 && (
        <CartBar
          cart={cart}
          cartTotal={cartTotal}
          onHold={handleHoldSale}
          onRecall={() => setShowHeld(true)}
          onClear={() => setCart([])}
          onCheckout={() => setShowCheckout(true)}
          isDark={isDark}
          text={text}
          textMuted={textMuted}
          border={border}
          orange={orange}
          card={card}
        />
      )}

      {/* Floating cart button */}
      {cart.length > 0 && (
        <TouchableOpacity
          style={{
            position: 'absolute', right: 12, top: '50%',
            transform: [{ translateY: -28 }],
            backgroundColor: orange, borderRadius: 28, width: 56, height: 56,
            justifyContent: 'center', alignItems: 'center',
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
          }}
          onPress={() => setShowCheckout(true)}
          activeOpacity={0.8}
        >
          <View style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1.5, borderColor: orange }}>
            <Text style={{ color: orange, fontSize: 10, fontWeight: '800' }}>
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </Text>
          </View>

          <ShoppingCart size={22} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800', marginTop: 1 }}>
            {formatCurrency(cartTotal)}
          </Text>
        </TouchableOpacity>
      )}

      <PosCheckoutModal
        visible={showCheckout}
        cart={cart}
        products={products}
        shopSettings={shopSettings}
        onClose={() => setShowCheckout(false)}
        onComplete={() => { setShowCheckout(false); setCart([]) }}
        onUpdateCart={setCart}
      />

      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={async (barcode) => {
          const product = await getProductByBarcode(barcode)
          if (product) {
            addToCart(product)
          } else {
            Alert.alert('Not Found', `No product with barcode "${barcode}"`)
          }
        }}
      />

      <HeldSalesSheet
        visible={showHeld}
        onRecall={(sale) => { handleRecall(sale); setShowHeld(false) }}
        onClose={() => setShowHeld(false)}
      />

      {priceProduct && (
        <PriceSelectionDialog
          product={priceProduct}
          onSelect={(unitPrice, quantity) => { addToCartWithPrice(unitPrice, quantity, priceProduct); setPriceProduct(null) }}
          onCancel={() => setPriceProduct(null)}
        />
      )}
    </SafeAreaView>
  )
}
