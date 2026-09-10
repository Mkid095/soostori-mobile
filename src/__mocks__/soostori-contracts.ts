// @soostori/contracts — runtime mock for jest (CJS).
// All exports from the contracts package are types (compile-time only) —
// at runtime, the contracts module evaluates to an empty object.
// This file exists so jest's moduleNameMapper can resolve the import
// without hitting the real ESM dist at C:/.../node_modules/.../contracts/.
//
// Cycle 04 Sub-cycle F: mirrors the `defaultSyncEngine` singleton +
// `NoOpSyncEngineClass` (with an inspectable queue) so Sub-cycle F's
// `sync-engine-mobile.test.ts` can assert `enqueue()` was called.
//
// Phase 05: adds `pull` and `apply` to support real sync engine tests.

type SyncEvent = Record<string, unknown>
interface QueuedSyncEvent { event: SyncEvent; enqueuedAt: number }

class NoOpSyncEngineClassMock {
  private readonly queue: QueuedSyncEvent[] = []
  private _pulledEvents: SyncEvent[] = []

  get pending(): readonly QueuedSyncEvent[] { return this.queue }
  get size(): number { return this.queue.length }
  get pulledEvents(): readonly SyncEvent[] { return this._pulledEvents }

  async enqueue(event: SyncEvent): Promise<{ state: 'queued' | 'acked' | 'rejected' }> {
    this.queue.push({ event: { ...event, state: 'pending' }, enqueuedAt: Date.now() })
    return { state: 'queued' }
  }

  async pull(_cursor: unknown): Promise<SyncEvent[]> {
    const events = [...this._pulledEvents]
    this._pulledEvents = []
    return events
  }

  apply<T>(_local: T, _event: SyncEvent): { state: 'no_op' | 'applied'; entityVersion?: number } {
    return { state: 'no_op' }
  }

  reset(): void {
    this.queue.length = 0
    this._pulledEvents = []
  }

  /** Test helper: inject events that the next pull() will return. */
  injectPulledEvents(...events: SyncEvent[]): void {
    this._pulledEvents.push(...events)
  }

  /** Test helper: find the most recent event matching a predicate. */
  lastMatching(pred: (e: SyncEvent) => boolean): SyncEvent | null {
    for (let i = this.queue.length - 1; i >= 0; i--) {
      if (pred(this.queue[i].event)) return this.queue[i].event
    }
    return null
  }
}

const _instance = new NoOpSyncEngineClassMock()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.NoOpSyncEngineClass = _instance
exports.NoOpSyncEngine = {
  enqueue: (event: SyncEvent) => _instance.enqueue(event),
  pull: (cursor: unknown) => _instance.pull(cursor),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apply: (local: any, event: SyncEvent) => _instance.apply(local, event),
}
exports.defaultSyncEngine = exports.NoOpSyncEngine
exports.applySyncEvent = () => ({ state: 'no_op' })
exports.DEFAULT_SYNC_CONTRACT_VERSION = 1
