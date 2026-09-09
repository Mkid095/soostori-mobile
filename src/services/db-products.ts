// Product CRUD operations — business logic in services, NOT components

export { getAllProducts, getProductById, getProductByBarcode, searchProducts, getLowStockProducts, canSell } from './db-products-queries'
export { createProduct } from './db-products-create'
export { updateProduct, deleteProduct } from './db-products-update'
export { adjustStock } from './db-products-stock-ops'
