// Mock for @soostori/events
module.exports = {
  getEventBus: () => ({
    publish: jest.fn(),
    subscribe: jest.fn(),
    clear: jest.fn(),
  }),
  createEvent: jest.fn((args) => ({
    id: 'event-mock-id',
    name: args.name,
    version: 1,
    deviceId: 'mock-device',
    userId: undefined,
    shopId: 'mock-shop',
    timestamp: new Date().toISOString(),
    sequence: 0,
    idempotencyKey: 'mock-key',
    entityId: args.entityId,
    entity: args.entity,
    source: 'local',
    payload: args.payload,
  })),
}
