// Database readiness hook.
// Exposes the SQLite handle once `getDb()` resolves and surfaces any error.

import { useEffect, useState } from 'react'
import * as SQLite from 'expo-sqlite'
import { getDb } from '../lib/db'

export interface UseDatabaseResult {
  db: SQLite.SQLiteDatabase | null
  isReady: boolean
  error: Error | null
}

export function useDatabase(): UseDatabaseResult {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    getDb()
      .then((handle) => { if (!cancelled) setDb(handle) })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)))
      })
    return () => { cancelled = true }
  }, [])

  return { db, isReady: db !== null, error }
}
