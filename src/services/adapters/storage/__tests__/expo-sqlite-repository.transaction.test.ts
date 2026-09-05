/**
 * ExpoSqliteRepository<T> — transaction + raw contract tests.
 *
 * Validates the Mobile platform adapter against the published
 * @soostori/storage.TransactionHandle interface.
 *
 * Run with:   npx tsx src/services/adapters/storage/__tests__/expo-sqlite-repository.transaction.test.ts
 */

import type { UUID } from '@soostori/core'
import { newId } from '@soostori/core'
import type { Repository, TransactionHandle } from '@soostori/storage'

import { ExpoSqliteRepository } from '../expo-sqlite-repository'
import { createMockDb } from './mock-sqlite'

interface ProductRow {
  id: string
  name: string
  selling_price: number
}

let passed = 0
let failed = 0

function assert(name: string, cond: boolean): void {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}`); failed++ }
}

async function run(): Promise<void> {
  console.log('\n=== Phase 11.1 Mobile ExpoSqliteRepository TRANSACTION tests ===\n')

  // [8] transaction() commits
  {
    const db = createMockDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo: Repository<ProductRow> = new ExpoSqliteRepository<ProductRow>(db as never, 'products')
    const result = await repo.transaction(async (tx: TransactionHandle) => {
      await tx.insert('products', { id: newId() as UUID, name: 'Tea', selling_price: 50 })
      await tx.insert('products', { id: newId() as UUID, name: 'Coffee', selling_price: 100 })
      return 2
    })
    assert('[8] transaction() returns commit value', result === 2)
  }

  // [9] transaction() rolls back on throw
  {
    const db = createMockDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo: Repository<ProductRow> = new ExpoSqliteRepository<ProductRow>(db as never, 'products')
    let threw = false
    try {
      await repo.transaction(async (_tx: TransactionHandle) => {
        await _tx.insert('products', {
          id: newId() as UUID,
          name: 'Sugar',
          selling_price: 200,
        })
        throw new Error('rollback')
      })
    } catch { threw = true }
    assert('[9] transaction() rethrows on failure', threw)
  }

  // [10] transaction().raw() returns query result
  {
    const db = createMockDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo: Repository<ProductRow> = new ExpoSqliteRepository<ProductRow>(db as never, 'products')
    const result = await repo.transaction(async (tx: TransactionHandle) =>
      tx.raw('SELECT COUNT(*) as n FROM products'))
    assert('[10] tx.raw() returns array', Array.isArray(result))
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((err: unknown) => {
  console.error('test runner failed:', err)
  process.exit(2)
})
