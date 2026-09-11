// @soostori/core — runtime mock for jest (CJS).
// The mapper only uses `asXxx()` brand casts, which are no-ops at runtime.
// All type-level imports are erased by TS compilation. This stub mirrors
// the alpha.7 brand surface that mobile's contracts-mapper needs.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const noop = (s: any) => s
// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.newId = () => 'mock-uuid'
exports.asUserId = noop
exports.asShopId = noop
exports.asEmployeeId = noop
exports.asDeviceId = noop
exports.asProductId = noop
exports.asCategoryId = noop
exports.asCustomerId = noop
exports.asSaleId = noop
exports.asDebtId = noop
exports.asDebtPaymentId = noop
exports.asPlanId = noop
exports.asSubscriptionId = noop
exports.asInvitationId = noop
exports.asSyncEventId = noop
exports.asBusinessId = noop
exports.asPersonId = noop
exports.asMembershipId = noop
exports.asStockMovementId = noop
exports.asIdempotencyKey = noop
exports.asCommissionRuleId = noop
exports.asCommissionLedgerId = noop
exports.asSalespersonApplicationId = noop
exports.asSalespersonProfileId = noop
exports.asInfluencerProfileId = noop
exports.asAuthAuditEventId = noop
exports.asExpenseId = noop
// Constants / errors / validation / types — not used by mapper at runtime
exports.MOBILE_OFFLINE_GRACE_DAYS = 2
exports.UNAUTHORIZED_LOGIN_CONTACT_PHONE = '+15555550100'
exports.SubscriptionGateError = class SubscriptionGateError extends Error {}
exports.AuthError = class AuthError extends Error {}
exports.SoostoriError = class SoostoriError extends Error {
  constructor(public code: string, message: string) { super(message) }
}
