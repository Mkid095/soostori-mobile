/**
 * Mobile auth adapters — public boundary.
 *
 * Phase 11.1 establishes only the SessionStorage adapter. PIN migration and
 * the existing authentication flow changes are reserved for later phases.
 */

export { AsyncStorageSessionStorage } from './session-storage'
