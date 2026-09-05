/**
 * ExpoSqliteRepository<T> — Mobile platform storage adapter.
 *
 * Wraps a single expo-sqlite table behind the published SDK contract:
 *
 *     @soostori/storage.Repository<T>
 *
 * This file lives in soostori-mobile (not the SDK) because it imports
 * the Mobile-only expo-sqlite dependency. The SDK stays SQLite-agnostic.
 */

import type {
  Repository,
  TransactionHandle,
} from '@soostori/storage'
import type { UUID } from '@soostori/core'
import type * as SQLite from 'expo-sqlite'

function buildWhere(
  filter: Record<string, unknown> | undefined,
): { sql: string; params: unknown[] } {
  if (!filter || Object.keys(filter).length === 0) {
    return { sql: '', params: [] }
  }
  const keys = Object.keys(filter)
  return {
    sql: ` WHERE ${keys.map((k) => `${k} = ?`).join(' AND ')}`,
    params: keys.map((k) => filter[k]),
  }
}

/** Mobile implementation of the SDK TransactionHandle. */
class ExpoSqliteTransactionHandle implements TransactionHandle {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: SQLite.SQLiteDatabase) {}

  async insert<T>(table: string, data: T): Promise<T> {
    const cols = Object.keys(data as Record<string, unknown>)
    const params = cols.map((c) => (data as Record<string, unknown>)[c])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.db.runAsync(sqlForInsert(table, cols), ...(params as any))
    return data
  }

  async update<T>(table: string, id: UUID, changes: Partial<T>): Promise<T> {
    const cols = Object.keys(changes as Record<string, unknown>)
    if (cols.length > 0) {
      const setValues = cols.map((c) => (changes as Record<string, unknown>)[c])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.db.runAsync(sqlForUpdate(table, cols), ...(setValues as any), id as any)
    }
    const row = await this.db.getFirstAsync<T>(
      `SELECT * FROM ${table} WHERE id = ?`,
      id as never,
    )
    return row as T
  }

  async delete(table: string, id: UUID): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.db.runAsync(`DELETE FROM ${table} WHERE id = ?`, id as any)
  }

  async raw(sql: string, params?: unknown[]): Promise<unknown[]> {
    return (await this.db.getAllAsync(
      sql,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...((params ?? []) as any),
    )) as unknown[]
  }
}

function sqlForInsert(table: string, cols: string[]): string {
  return `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
}

function sqlForUpdate(table: string, cols: string[]): string {
  return `UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`
}

/** ExpoSqliteRepository<T> — satisfies `@soostori/storage.Repository<T>`. */
export class ExpoSqliteRepository<T> implements Repository<T> {
  constructor(
    private readonly db: SQLite.SQLiteDatabase,
    private readonly tableName: string,
    private readonly idColumn: string = 'id',
  ) {}

  async findById(id: UUID): Promise<T | null> {
    const row = await this.db.getFirstAsync<T>(
      `SELECT * FROM ${this.tableName} WHERE ${this.idColumn} = ?`,
      id as never,
    )
    return (row ?? null) as T | null
  }

  async findMany(filter?: Record<string, unknown>): Promise<T[]> {
    const where = buildWhere(filter)
    return (await this.db.getAllAsync(
      `SELECT * FROM ${this.tableName}${where.sql}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...((where.params) as any),
    )) as T[]
  }

  async create(data: T): Promise<T> {
    const cols = Object.keys(data as Record<string, unknown>)
    const params = cols.map((c) => (data as Record<string, unknown>)[c])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.db.runAsync(sqlForInsert(this.tableName, cols), ...(params as any))
    return data
  }

  async update(id: UUID, changes: Partial<T>): Promise<T> {
    const cols = Object.keys(changes as Record<string, unknown>)
    if (cols.length > 0) {
      const setValues = cols.map((c) => (changes as Record<string, unknown>)[c])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.db.runAsync(sqlForUpdate(this.tableName, cols), ...(setValues as any), id as any)
    }
    const row = await this.db.getFirstAsync<T>(
      `SELECT * FROM ${this.tableName} WHERE ${this.idColumn} = ?`,
      id as never,
    )
    return row as T
  }

  async delete(id: UUID): Promise<void> {
    await this.db.runAsync(
      `DELETE FROM ${this.tableName} WHERE ${this.idColumn} = ?`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      id as any,
    )
  }

  async transaction<R>(fn: (tx: TransactionHandle) => Promise<R>): Promise<R> {
    await this.db.execAsync('BEGIN')
    const tx = new ExpoSqliteTransactionHandle(this.db)
    try {
      const result = await fn(tx)
      await this.db.execAsync('COMMIT')
      return result
    } catch (err) {
      try { await this.db.execAsync('ROLLBACK') } catch { /* swallow */ }
      throw err
    }
  }
}
