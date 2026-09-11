// Mock for @soostori/inventory
module.exports = {
  StockMovementLedger: jest.fn().mockImplementation(() => ({
    apply: jest.fn(),
    getBalance: jest.fn(),
  })),
}
