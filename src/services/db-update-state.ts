// db-update-state.ts — Persist OTA update state across app restarts
//
// Stores: last check timestamp, downloaded version, update type, and
// whether a restart-ready update is waiting to be applied.

import { getDb } from '../lib/db'

export interface UpdateStateRow {
  id: string
  lastCheckedAt: string | null
  downloadedVersion: string | null
  updateType: 'OTA' | 'BINARY' | null
  isRuntimeCompatible: number // 0/1
  downloadedAt: string | null
}

const TABLE = 'update_state'
const DEFAULT_ID = 'default'

export async function getUpdateState(): Promise<UpdateStateRow> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM ${TABLE} WHERE id = ?`,
    DEFAULT_ID,
  )
  if (!row) {
    return {
      id: DEFAULT_ID,
      lastCheckedAt: null,
      downloadedVersion: null,
      updateType: null,
      isRuntimeCompatible: 1,
      downloadedAt: null,
    }
  }
  return {
    id: String(row.id),
    lastCheckedAt: row.last_checked_at ? String(row.last_checked_at) : null,
    downloadedVersion: row.downloaded_version ? String(row.downloaded_version) : null,
    updateType: row.update_type
      ? (row.update_type as 'OTA' | 'BINARY')
      : null,
    isRuntimeCompatible: Number(row.is_runtime_compatible ?? 1),
    downloadedAt: row.downloaded_at ? String(row.downloaded_at) : null,
  }
}

export async function setUpdateState(updates: {
  lastCheckedAt?: string
  downloadedVersion?: string | null
  updateType?: 'OTA' | 'BINARY' | null
  isRuntimeCompatible?: boolean
  downloadedAt?: string | null
}): Promise<void> {
  const db = await getDb()
  const sets: string[] = []
  const values: (string | number | null)[] = []

  if (updates.lastCheckedAt !== undefined) {
    sets.push('last_checked_at = ?')
    values.push(updates.lastCheckedAt)
  }
  if (updates.downloadedVersion !== undefined) {
    sets.push('downloaded_version = ?')
    values.push(updates.downloadedVersion ?? null)
  }
  if (updates.updateType !== undefined) {
    sets.push('update_type = ?')
    values.push(updates.updateType ?? null)
  }
  if (updates.isRuntimeCompatible !== undefined) {
    sets.push('is_runtime_compatible = ?')
    values.push(updates.isRuntimeCompatible ? 1 : 0)
  }
  if (updates.downloadedAt !== undefined) {
    sets.push('downloaded_at = ?')
    values.push(updates.downloadedAt ?? null)
  }

  if (sets.length === 0) return

  await db.runAsync(
    `INSERT INTO ${TABLE} (id) VALUES (?) ON CONFLICT(id) DO UPDATE SET ${sets.join(', ')}`,
    DEFAULT_ID,
    ...values,
  )
}

export async function clearUpdateState(): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `UPDATE ${TABLE} SET downloaded_version=NULL, update_type=NULL, downloaded_at=NULL, is_runtime_compatible=1 WHERE id=?`,
    DEFAULT_ID,
  )
}
