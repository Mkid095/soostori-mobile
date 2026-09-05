/**
 * Mobile storage adapter — public boundary.
 *
 * Exposes `ExpoSqliteRepository<T>` as a generic factory for the SDK
 * `@soostori/storage.Repository<T>` contract. Per-domain migration remains
 * Phase 11.3 work; this file establishes only the contract boundary.
 */

export { ExpoSqliteRepository } from './expo-sqlite-repository'
