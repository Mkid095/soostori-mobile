/**
 * expo-deep-link.ts — Phase 17 notification deep-link mapping
 *
 * Responsibilities:
 * - Map SyncEvent types → in-app deep links
 * - Build expo-router pathname+params from event data
 */
export type NotificationDeepLink = {
  screen: string
  params?: Record<string, string>
}

/** Map SyncEvent types → in-app deep links. */
export function eventToDeepLink(
  eventType: string,
  payload: Record<string, unknown>,
): NotificationDeepLink | null {
  switch (eventType) {
    case 'sale.created':
      return { screen: '/sales-history', params: { saleId: String(payload.saleId ?? '') } }
    case 'debt.payment_recorded':
    case 'debt.created':
    case 'debt.settled':
      return { screen: '/debt', params: { debtId: String(payload.debtId ?? '') } }
    case 'inventory.low_stock':
      return { screen: '/low-stock', params: { productId: String(payload.productId ?? '') } }
    case 'inventory.received':
    case 'inventory.adjusted':
      return { screen: '/inventory', params: { productId: String(payload.productId ?? '') } }
    case 'expense.created':
    case 'expense.approved':
      return { screen: '/expenses', params: { expenseId: String(payload.expenseId ?? '') } }
    case 'commission.created':
      return { screen: '/commissions', params: { commissionId: String(payload.commissionId ?? '') } }
    case 'team.member_added':
      return { screen: '/team' }
    case 'device.enrolled':
      return { screen: '/devices' }
    default:
      return { screen: '/notifications' }
  }
}

/** Build a path+params string for expo-router navigation. */
export function buildDeepLinkPath(
  eventType: string,
  payload: Record<string, unknown>,
): { pathname: string; params?: Record<string, string> } {
  const link = eventToDeepLink(eventType, payload)
  if (!link) return { pathname: '/notifications' }
  const pathname = link.screen.startsWith('/') ? link.screen.slice(1) : link.screen
  return { pathname, params: link.params }
}
