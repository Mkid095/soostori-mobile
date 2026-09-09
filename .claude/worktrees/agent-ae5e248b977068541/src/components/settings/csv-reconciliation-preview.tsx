// csv-reconciliation-preview.tsx — Full-screen reconciliation preview modal
import { useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, Modal } from 'react-native'
import { X, Check, AlertCircle } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import type { ParsedRow, ReconciliationResult } from '../../services/db-import-export'
import { parseProductCsv, buildReconciliation, importProductsBatch } from '../../services/db-import-export'

interface Props {
  visible: boolean
  csvContent: string
  onClose: () => void
  onDone: () => void
}

const STATUS_COLORS = {
  NEW: '#22C55E',
  DUPLICATE: '#F59E0B',
  NO_BARCODE: '#EF4444',
}

const STATUS_LABELS = {
  NEW: 'NEW',
  DUPLICATE: 'DUP',
  NO_BARCODE: 'NO BARCODE',
}

export function CsvReconciliationPreview({ visible, csvContent, onClose, onDone }: Props) {
  const { bg, card, text, textSecondary: muted, border, brand: orange, success, danger } = useTheme()
  const [result, setResult] = useState<ReconciliationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [done, setDone] = useState(false)
  const [doneResult, setDoneResult] = useState<{ created: number; updated: number; skipped: number } | null>(null)

  async function loadReconciliation() {
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
  }

  async function handleImport() {
    if (!result) return
    setImporting(true)
    try {
      const res = await importProductsBatch(result.rows)
      setDoneResult(res)
      setDone(true)
    } finally {
      setImporting(false)
    }
  }

  function handleClose() {
    if (importing) return
    setResult(null)
    setDone(false)
    setDoneResult(null)
    onClose()
  }

  function handleDone() {
    setResult(null)
    setDone(false)
    setDoneResult(null)
    onDone()
  }

  // Trigger load when modal opens
  useState(() => {
    if (visible && !result) loadReconciliation()
  })

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border }]}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: text }}>Import Preview</Text>
          <TouchableOpacity onPress={handleClose} disabled={importing}>
            <X size={22} color={muted} />
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={orange} />
            <Text style={{ color: muted, marginTop: 12 }}>Analyzing CSV...</Text>
          </View>
        )}

        {!loading && result && (
          <>
            {/* Summary */}
            <View style={[styles.summary, { backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border }]}>
              <View style={styles.summaryItem}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#22C55E' }}>{result.newCount}</Text>
                <Text style={{ fontSize: 11, color: muted }}>New</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: border }]} />
              <View style={styles.summaryItem}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#F59E0B' }}>{result.duplicateCount}</Text>
                <Text style={{ fontSize: 11, color: muted }}>Duplicates</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: border }]} />
              <View style={styles.summaryItem}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#EF4444' }}>{result.noBarcodeCount}</Text>
                <Text style={{ fontSize: 11, color: muted }}>No Barcode</Text>
              </View>
            </View>

            {/* Errors */}
            {result.errors.length > 0 && (
              <View style={[styles.errorBox, { backgroundColor: '#FEF2F2', borderColor: danger }]}>
                {result.errors.slice(0, 3).map((e, i) => (
                  <Text key={i} style={{ fontSize: 12, color: danger }}>{e}</Text>
                ))}
              </View>
            )}

            {/* Table */}
            {done ? (
              <View style={styles.centered}>
                <Check size={48} color={success} />
                <Text style={{ fontSize: 18, fontWeight: '800', color: text, marginTop: 12 }}>Import Complete</Text>
                <Text style={{ color: muted, marginTop: 8 }}>
                  Created {doneResult?.created}, updated {doneResult?.updated}, skipped {doneResult?.skipped}
                </Text>
                <TouchableOpacity style={[styles.doneBtn, { backgroundColor: orange }]} onPress={handleDone}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={[styles.tableHeader, { backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border }]}>
                  <Text style={[styles.colStatus, { color: muted }]}>Status</Text>
                  <Text style={[styles.colName, { color: muted }]}>Product</Text>
                  <Text style={[styles.colBarcode, { color: muted }]}>Barcode</Text>
                </View>
                <FlatList
                  data={result.rows}
                  keyExtractor={(_, i) => String(i)}
                  renderItem={({ item }) => (
                    <View style={[styles.tableRow, { borderBottomWidth: 1, borderBottomColor: border }]}>
                      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '22' }]}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: STATUS_COLORS[item.status] }}>
                          {STATUS_LABELS[item.status]}
                        </Text>
                      </View>
                      <Text style={[styles.colName, { color: text }]} numberOfLines={1}>{item.row.name}</Text>
                      <Text style={[styles.colBarcode, { color: muted }]} numberOfLines={1}>
                        {item.row.barcode || '—'}
                      </Text>
                    </View>
                  )}
                />
                {/* Progress */}
                {importing && (
                  <View style={styles.progressBox}>
                    <ActivityIndicator size="small" color={orange} />
                    <Text style={{ color: muted, fontSize: 13 }}>Importing {progress.current}/{progress.total}...</Text>
                  </View>
                )}
                {/* Import Button */}
                <View style={[styles.footer, { backgroundColor: card, borderTopWidth: 1, borderTopColor: border }]}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: border }]}
                    onPress={handleClose}
                    disabled={importing}
                  >
                    <Text style={{ color: text, fontWeight: '700' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.importBtn, { backgroundColor: success, opacity: importing ? 0.6 : 1 }]}
                    onPress={handleImport}
                    disabled={importing || result.newCount + result.duplicateCount === 0}
                  >
                    {importing
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={{ color: '#fff', fontWeight: '800' }}>Import Selected</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  summary: { flexDirection: 'row', paddingVertical: 14 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1 },
  errorBox: { margin: 12, padding: 10, borderRadius: 8, borderWidth: 1 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  colStatus: { fontSize: 11, fontWeight: '700', width: 60 },
  colName: { flex: 1, fontSize: 13 },
  colBarcode: { fontSize: 12, width: 100, textAlign: 'right' },
  statusBadge: { width: 52, height: 20, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  progressBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 },
  footer: { flexDirection: 'row', gap: 10, padding: 14 },
  cancelBtn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: 'center', borderWidth: 1 },
  importBtn: { flex: 2, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  doneBtn: { marginTop: 20, borderRadius: 10, paddingHorizontal: 32, paddingVertical: 12 },
})
