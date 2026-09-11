// Sale CRUD operations — business logic in services, NOT components
// Re-exports queries and mutations for backward compatibility

export { createSale, InsufficientStockError } from './db-sale-create'
export { createSaleOffline } from './db-sale-offline'

export {
  getSaleById, getHeldSales, getLastHeldSale, getReceiptHistory, getPendingSales,
  type ReceiptHistoryItem,
} from './db-sales-queries'

export { getTodaySales, getWeekSales, getMonthSales, getAllSales } from './db-sales-time-queries'

export {
  holdSale, deleteHeldSale, createPendingSale, confirmPendingSale, rejectPendingSale,
} from './db-sales-mutations'

export { refundSale, getRefundItems } from './db-sale-refund'
