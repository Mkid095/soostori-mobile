// pos-checkout-lan-persistence.spec.ts — P0-9 sale-loss-on-LAN regression
//
// The original mobile POS bug: when LAN-connected, the sale was shown as
// complete and a receipt was built, but NO row was written to local SQLite
// and NO `lanClient.emitSalePending` was sent to the host. Cash could be
// taken for a sale that did not exist anywhere.
//
// This spec exercises the persistence + LAN-notify service directly and
// pins the contract:
//   1. createSaleOffline is ALWAYS called before the receipt is shown.
//   2. lanClient.emitSalePending is called when LAN is connected.
//   3. LAN failure is non-fatal: the local persist wins, the receipt is
//      still returned, and the caller surfaces a warning.
//   4. createSaleOffline failure is fatal: nothing is emitted and no
//      receipt is built.
//
// Mocking strategy: ts-jest transpiles to CommonJS, so `jest.unstable_mockModule`
// (ESM-only) does NOT apply. We use `jest.doMock` + `require` so the CJS
// `require()` calls inside the service pick up the mock factories.
//
// Run: npx jest src/components/pos/__tests__/pos-checkout-lan-persistence.spec.ts

// ── Mock state (declared at module scope) ─────────────────────────────────────

const mockCreateSaleOffline = jest.fn()
const mockIsConnected = jest.fn()
const mockEmitSalePending = jest.fn()
const mockBuildReceiptData = jest.fn()

// `doMock` (non-hoisted CJS mock) is applied BEFORE the service is `require`d.
jest.doMock('../../../services/db-sale-offline', () => ({
  createSaleOffline: mockCreateSaleOffline,
}))

jest.doMock('../../../services/lan-client', () => ({
  lanClient: {
    isConnected: () => mockIsConnected(),
    emitSalePending: mockEmitSalePending,
  },
}))

jest.doMock('../../../services/db-receipts', () => ({
  buildReceiptData: mockBuildReceiptData,
}))

// Service is required AFTER the mocks so the CJS `require()` calls inside
// the service pick up the mock factories above.
import type * as PosCheckoutCompletion from '../../../services/pos-checkout-completion'
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const posCheckoutCompletionModule = require('../../../services/pos-checkout-completion') as typeof PosCheckoutCompletion
const completePosCheckout: typeof PosCheckoutCompletion.completePosCheckout =
  posCheckoutCompletionModule.completePosCheckout

// AsyncStorage is already routed to src/__mocks__/async-storage.ts by jest config.

// ── Fixtures ──────────────────────────────────────────────────────────────────

const sampleCart = [
  { productId: 'p1', productName: 'Item A', quantity: 2, unitPrice: 50, totalPrice: 100, discount: 0 },
  { productId: 'p2', productName: 'Item B', quantity: 1, unitPrice: 200, totalPrice: 200, discount: 0, variationName: 'large' },
]

const sampleShopSettings = {
  id: 'shop-1',
  name: 'Test Shop',
  address: '123 Test St',
  phone: '+254700000000',
  currency: 'KES',
  receiptFooter: 'Thank you',
  lowStockDefault: 5,
  updatedAt: '2026-10-05T00:00:00Z',
}

const sampleSale = {
  id: 'sale-001',
  type: 'retail',
  status: 'pending_offline',
  subtotal: 300,
  discountAmount: 0,
  totalAmount: 300,
  paidAmount: 300,
  paymentMethod: 'cash',
  createdAt: '2026-10-05T12:00:00Z',
  updatedAt: '2026-10-05T12:00:00Z',
}

const sampleReceipt = {
  shopName: 'Test Shop',
  receiptNumber: 'sale-001',
  date: '05/10/2026 12:00',
  items: [],
  subtotal: 300,
  discount: 0,
  total: 300,
  paymentMethod: 'Cash',
}

// ── Test suite ───────────────────────────────────────────────────────────────

describe('completePosCheckout (P0-9 sale-loss-on-LAN fix)', () => {
  beforeEach(() => {
    mockCreateSaleOffline.mockReset()
    mockIsConnected.mockReset()
    mockEmitSalePending.mockReset()
    mockBuildReceiptData.mockReset()

    mockCreateSaleOffline.mockResolvedValue(sampleSale)
    mockBuildReceiptData.mockReturnValue(sampleReceipt)
    mockIsConnected.mockReturnValue(false)
  })

  it('P0-9-A: LAN-connected path persists BEFORE notifying the host', async () => {
    mockIsConnected.mockReturnValue(true)
    const callOrder: string[] = []
    mockCreateSaleOffline.mockImplementation(async () => {
      callOrder.push('persist')
      return sampleSale
    })
    mockEmitSalePending.mockImplementation(() => {
      callOrder.push('emit')
    })

    const result = await completePosCheckout({
      cart: sampleCart,
      paymentMethod: 'cash',
      cartTotal: 300,
      shopSettings: sampleShopSettings,
    })

    // Persist runs first, then emit. Without persist-first the host would
    // be notified about a sale that has no SQLite row — exactly the bug.
    expect(callOrder).toEqual(['persist', 'emit'])
    expect(mockCreateSaleOffline).toHaveBeenCalledTimes(1)
    expect(mockEmitSalePending).toHaveBeenCalledTimes(1)
    expect(result.lanEmitted).toBe(true)
    expect(result.lanEmitError).toBeUndefined()
    expect(result.receipt).toBe(sampleReceipt)
  })

  it('P0-9-B: LAN-disconnected path still persists (existing behaviour preserved)', async () => {
    mockIsConnected.mockReturnValue(false)

    const result = await completePosCheckout({
      cart: sampleCart,
      paymentMethod: 'cash',
      cartTotal: 300,
      shopSettings: sampleShopSettings,
    })

    expect(mockCreateSaleOffline).toHaveBeenCalledTimes(1)
    expect(mockEmitSalePending).not.toHaveBeenCalled()
    expect(result.lanEmitted).toBe(false)
    expect(result.lanEmitError).toBeUndefined()
    expect(result.receipt).toBe(sampleReceipt)
  })

  it('P0-9-C: LAN failure AFTER local persist does NOT crash — local persist wins', async () => {
    mockIsConnected.mockReturnValue(true)
    mockEmitSalePending.mockImplementation(() => {
      throw new Error('WebSocket closed')
    })

    const result = await completePosCheckout({
      cart: sampleCart,
      paymentMethod: 'cash',
      cartTotal: 300,
      shopSettings: sampleShopSettings,
    })

    // Persist still ran exactly once.
    expect(mockCreateSaleOffline).toHaveBeenCalledTimes(1)
    // Emit was attempted but threw.
    expect(mockEmitSalePending).toHaveBeenCalledTimes(1)
    // The caller can still show a receipt — the sale is on disk.
    expect(result.receipt).toBe(sampleReceipt)
    // The structured error is surfaced so the UI can warn the user.
    expect(result.lanEmitted).toBe(false)
    expect(result.lanEmitError).toBeInstanceOf(Error)
    expect((result.lanEmitError as Error).message).toBe('WebSocket closed')
  })

  it('P0-9-D: persist call carries the correct cart, total, payment method, and zeros for discount', async () => {
    mockIsConnected.mockReturnValue(false)

    await completePosCheckout({
      cart: sampleCart,
      paymentMethod: 'mpesa',
      cartTotal: 300,
      shopSettings: sampleShopSettings,
    })

    // Signature: (cart, paymentMethod, subtotal, discountAmount, totalAmount)
    expect(mockCreateSaleOffline).toHaveBeenCalledWith(
      sampleCart,
      'mpesa',
      300,
      0,
      300,
    )
  })

  it('P0-9-E: emitSalePending receives the persisted saleId, mapped items, and metadata', async () => {
    mockIsConnected.mockReturnValue(true)

    await completePosCheckout({
      cart: sampleCart,
      paymentMethod: 'cash',
      cartTotal: 300,
      shopSettings: sampleShopSettings,
    })

    expect(mockEmitSalePending).toHaveBeenCalledWith(
      expect.objectContaining({
        saleId: 'sale-001', // from the persisted sale, not a fresh id
        totalAmount: 300,
        paymentMethod: 'cash',
        timestamp: '2026-10-05T12:00:00Z',
        items: [
          { productId: 'p1', variantName: undefined, quantity: 2, unitPrice: 50, totalPrice: 100 },
          { productId: 'p2', variantName: 'large', quantity: 1, unitPrice: 200, totalPrice: 200 },
        ],
      }),
    )
  })

  it('P0-9-F: createSaleOffline failure throws and skips emit + receipt', async () => {
    mockIsConnected.mockReturnValue(true)
    mockCreateSaleOffline.mockRejectedValue(new Error('Insufficient stock for p1'))

    await expect(
      completePosCheckout({
        cart: sampleCart,
        paymentMethod: 'cash',
        cartTotal: 300,
        shopSettings: sampleShopSettings,
      }),
    ).rejects.toThrow('Insufficient stock')

    // Receipt must never be built when persist fails — the caller would
    // otherwise show success for a sale that does not exist.
    expect(mockEmitSalePending).not.toHaveBeenCalled()
    expect(mockBuildReceiptData).not.toHaveBeenCalled()
  })

  it('P0-9-G: receipt is built from the persisted sale.id (never a freshly generated id)', async () => {
    mockIsConnected.mockReturnValue(true)

    await completePosCheckout({
      cart: sampleCart,
      paymentMethod: 'cash',
      cartTotal: 300,
      shopSettings: sampleShopSettings,
    })

    expect(mockBuildReceiptData).toHaveBeenCalledWith(
      sampleCart,
      sampleShopSettings,
      'cash',
      'sale-001', // matches the persisted sale — proves the link, not a fresh id
    )
  })

  it('P0-9-H: a no-op LAN state (not connected) returns lanEmitted=false with no error', async () => {
    mockIsConnected.mockReturnValue(false)

    const result = await completePosCheckout({
      cart: sampleCart,
      paymentMethod: 'cash',
      cartTotal: 300,
      shopSettings: sampleShopSettings,
    })

    // No LAN attempt means no error to surface.
    expect(result.lanEmitted).toBe(false)
    expect(result.lanEmitError).toBeUndefined()
    // And the sale is still in the database (offline path).
    expect(mockCreateSaleOffline).toHaveBeenCalledTimes(1)
  })
})
