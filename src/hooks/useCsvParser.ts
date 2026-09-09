// useCsvParser.ts — CSV parsing and reconciliation hook
import { useState, useCallback } from 'react'
import type { ParsedRow, ReconciliationResult } from '../services/db-import-export'
import { parseProductCsv, buildReconciliation } from '../services/db-import-export'

export function useCsvParser() {
  const [result, setResult] = useState<ReconciliationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [done, setDone] = useState(false)
  const [doneResult, setDoneResult] = useState<{ created: number; updated: number; skipped: number } | null>(null)

  const loadReconciliation = useCallback(async (csvContent: string) => {
    setLoading(true)
    setDone(false)
    setDoneResult(null)
    try {
      const { rows, errors } = parseProductCsv(csvContent)
      if (errors.length > 0 && rows.length === 0) {
        setResult({ rows: [], newCount: 0, duplicateCount: 0, noBarcodeCount: 0, errors })
      } else {
        const recon = await buildReconciliation(rows)
        recon.errors.push(...errors)
        setResult(recon)
      }
    } catch (e) {
      setResult({ rows: [], newCount: 0, duplicateCount: 0, noBarcodeCount: 0, errors: [String(e)] })
    }
    setLoading(false)
  }, [])

  const handleImport = useCallback(async () => {
    if (!result) return
    setImporting(true)
    try {
      const { importProductsBatch } = await import('../services/db-import-export')
      const res = await importProductsBatch(result.rows)
      setDoneResult(res)
      setDone(true)
    } finally {
      setImporting(false)
    }
  }, [result])

  const reset = useCallback(() => {
    setResult(null)
    setDone(false)
    setDoneResult(null)
  }, [])

  return { result, loading, importing, progress, done, doneResult, loadReconciliation, handleImport, reset }
}
