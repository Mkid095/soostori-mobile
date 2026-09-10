// @soostori/contracts — runtime mock for jest (CJS).
// All exports from the contracts package are types (compile-time only) —
// at runtime, the contracts module evaluates to an empty object.
// This file exists so jest's moduleNameMapper can resolve the import
// without hitting the real ESM dist at C:/.../node_modules/.../contracts/.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.NoOpSyncEngine = {
  enqueue: async () => ({ state: 'queued' }),
  pull: async () => [],
  apply: () => ({ state: 'no_op' }),
}
exports.applySyncEvent = () => ({ state: 'no_op' })
exports.DEFAULT_SYNC_CONTRACT_VERSION = 1
