// useCart — cart state management for POS/sell screens
import { useState, useCallback } from 'react'
import type { CartItem, Product, ProductVariant } from '../lib/types'
import { holdSale } from '../services/db-sales'

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([])

  const cartTotal = cart.reduce((s, i) => s + i.totalPrice, 0)

  const addToCartWithPrice = useCallback((
    unitPrice: number,
    quantity: number,
    product: Product,
    variationName?: string,
  ) => {
    setCart((prev) => {
      const matchKey = variationName ? `${product.id}|${variationName}` : product.id
      const existingIdx = prev.findIndex((c) =>
        (variationName ? `${c.productId}|${c.variationName}` : c.productId) === matchKey,
      )
      if (existingIdx >= 0) {
        const existing = prev[existingIdx]
        const newQty = existing.quantity + quantity
        const newTotal = newQty * unitPrice
        const updated = { ...existing, quantity: newQty, unitPrice, totalPrice: newTotal }
        return prev.map((c, i) => (i === existingIdx ? updated : c))
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
        discount: 0,
        variationName,
      }]
    })
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const updateCart = useCallback((newCart: CartItem[]) => setCart(newCart), [])

  const handleHoldSale = useCallback(async () => {
    if (cart.length === 0) return
    await holdSale(cart)
    setCart([])
  }, [cart])

  return {
    cart,
    cartTotal,
    addToCartWithPrice,
    clearCart,
    updateCart,
    handleHoldSale,
  }
}
