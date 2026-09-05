/**
 * Shared in-memory mock for expo-sqlite — used by all contract tests.
 */

export interface SQLiteDatabaseMock {
  execAsync: (sql: string) => Promise<void>
  runAsync: (sql: string, ...params: unknown[]) => Promise<{ rowsAffected: number }>
  getFirstAsync: <Row>(sql: string, ...params: unknown[]) => Promise<Row | null>
  getAllAsync: <Row>(sql: string, ...params: unknown[]) => Promise<Row[]>
}

export interface Row { [column: string]: unknown }

export function createMockDb(): SQLiteDatabaseMock {
  const tables = new Map<string, Row[]>()

  function columnsFromInsert(sql: string): string[] {
    const m = /INSERT INTO (\w+) \((.+)\) VALUES/i.exec(sql)
    if (!m) throw new Error(`unparseable INSERT: ${sql}`)
    return m[2].split(',').map((s) => s.trim())
  }

  function columnsFromUpdate(sql: string): string[] {
    const m = /UPDATE (\w+) SET (.+) WHERE/i.exec(sql)
    if (!m) throw new Error(`unparseable UPDATE: ${sql}`)
    const sets = m[2].split(',').map((s) => s.trim())
    return sets.map((s) => {
      const k = /^(\w+) = \?$/.exec(s)
      if (!k) throw new Error(`unparseable SET clause: ${s}`)
      return k[1]
    })
  }

  function tableFromSql(sql: string): string {
    const m = /(?:FROM|INTO|UPDATE) (\w+)/i.exec(sql)
    if (!m) throw new Error(`cannot extract table from sql: ${sql}`)
    return m[1]
  }

  function whereClauses(sql: string): { column: string }[] {
    const m = / WHERE (.+)$/i.exec(sql)
    if (!m) return []
    return m[1].split(' AND ').map((c) => {
      const k = /^(.+) = \?$/.exec(c.trim())
      if (!k) throw new Error(`unparseable WHERE: ${c}`)
      return { column: k[1].trim() }
    })
  }

  function ensureTable(name: string): Row[] {
    let rows = tables.get(name)
    if (!rows) { rows = []; tables.set(name, rows) }
    return rows
  }

  function filterRows(rows: Row[], sql: string, params: unknown[]): Row[] {
    const filters = whereClauses(sql)
    if (filters.length === 0) return rows
    const whereParams = params.slice(-filters.length)
    return rows.filter((row) =>
      filters.every((f, i) => row[f.column] === whereParams[i]),
    )
  }

  return {
    async execAsync() { /* no-op transaction markers */ },
    async runAsync(sql: string, ...params: unknown[]): Promise<{ rowsAffected: number }> {
      const upper = sql.trim().toUpperCase()
      const table = tableFromSql(sql)
      const rows = ensureTable(table)
      if (upper.startsWith('INSERT')) {
        const cols = columnsFromInsert(sql)
        const row: Row = {}
        for (let i = 0; i < cols.length; i++) row[cols[i]] = params[i]
        rows.push(row)
        return { rowsAffected: 1 }
      }
      if (upper.startsWith('UPDATE')) {
        const cols = columnsFromUpdate(sql)
        const updateParams = params.slice(0, cols.length)
        const filters = whereClauses(sql)
        const whereParams = params.slice(cols.length)
        let affected = 0
        for (const row of rows) {
          const match = filters.every((f, i) => row[f.column] === whereParams[i])
          if (match) {
            for (let i = 0; i < cols.length; i++) row[cols[i]] = updateParams[i]
            affected++
          }
        }
        return { rowsAffected: affected }
      }
      if (upper.startsWith('DELETE')) {
        const filters = whereClauses(sql)
        const before = rows.length
        for (let i = rows.length - 1; i >= 0; i--) {
          const match = filters.every((f, j) => rows[i][f.column] === params[j])
          if (match) rows.splice(i, 1)
        }
        return { rowsAffected: before - rows.length }
      }
      throw new Error(`unsupported statement: ${sql}`)
    },
    async getFirstAsync<Row>(sql: string, ...params: unknown[]): Promise<Row | null> {
      const upper = sql.trim().toUpperCase()
      if (!upper.startsWith('SELECT')) throw new Error(`unsupported statement: ${sql}`)
      const table = tableFromSql(sql)
      const rows = ensureTable(table)
      const matched = filterRows(rows, sql, params)
      return (matched[0] as Row) ?? null
    },
    async getAllAsync<Row>(sql: string, ...params: unknown[]): Promise<Row[]> {
      const upper = sql.trim().toUpperCase()
      if (!upper.startsWith('SELECT')) throw new Error(`unsupported statement: ${sql}`)
      const table = tableFromSql(sql)
      const rows = ensureTable(table)
      return filterRows(rows, sql, params) as Row[]
    },
  }
}
