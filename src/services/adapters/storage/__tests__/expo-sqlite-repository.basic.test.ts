/**
 * ExpoSqliteRepository<T> — basic CRUD contract tests.
 *
 * Validates the Mobile platform adapter against the published
 * @soostori/storage.Repository<T> interface for find/create/update/delete.
 *
 * Run with:   npx tsx src/services/adapters/storage/__tests__/expo-sqlite-repository.basic.test.ts
 */

import type { UUID } from '@soostori/core'
import { newId } from '@soostori/core'
import type { Repository } from '@soostori/storage'

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
  console.log('\n=== Phase 11.1 Mobile ExpoSqliteRepository BASIC CRUD tests ===\n')

  const db = createMockDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const repo: Repository<ProductRow> = new ExpoSqliteRepository<ProductRow>(db as never, 'products')

  assert('[1] repo satisfies Repository<T>', repo !== null)

  const id = newId() as UUID
  const created = await repo.create({ id, name: 'Bun', selling_price: 30 })
  assert('[2] create() returns row', created.name === 'Bun')

  const found = await repo.findById(id)
  assert('[3] findById() returns row', found?.id === id)

  const missing = await repo.findById(newId() as UUID)
  assert('[4] findById() returns null when missing', missing === null)

  const many = await repo.findMany({ name: 'Bun' })
  assert('[5] findMany() with filter returns array', Array.isArray(many))

  const updated = await repo.update(id, { selling_price: 35 })
  assert('[6] update() returns new state', (updated as ProductRow).selling_price === 35)

  await repo.delete(id)
  const after = await repo.findById(id)
  assert('[7] delete() removes row', after === null)

  console.log(`\nTotal: ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((err: unknown) => {
  console.error('test runner failed:', err)
  process.exit(2)
})
