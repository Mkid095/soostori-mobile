// app/(tabs)/inventory.tsx — Phase 09: Inventory summary + quick actions + low-stock + movements
import { useState, useEffect, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, StyleSheet, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Package, TrendingDown, Plus, Minus, ArrowRight, ArrowUpRight } from 'lucide-react-native'
import { useTheme } from '../../src/hooks/useTheme'
import type { StockMovement } from '@soostori/contracts'
import { getInventorySummary, getRecentStockMovements } from '../../src/services/inventory-mobile'
import { getAllProducts } from '../../src/services/db-products'
import { adjustStock } from '../../src/services/db-products'
import { STOCK_REASONS } from '../../src/components/inventory/inventory-types'
import { AppHeader } from '../../src/components/shared/app-header'
import { formatCurrency, formatDateTime } from '../../src/lib/formatters'

const INV_STYLES = StyleSheet.create({
  card: { borderRadius: 12, padding: 14, borderWidth: 1 },
  statBox: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1 },
  alertRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1 },
  movementRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1 },
})

// ── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({ summary }: { summary: { totalProducts: number; totalValue: number; lowStockCount: number } }) {
  const { card, text, textSecondary: muted, border, brand, danger } = useTheme()

  return (
    <View style={[INV_STYLES.card, { backgroundColor: card, borderColor: border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <Package size={18} color={brand} />
        <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginLeft: 8 }}>Inventory Summary</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={[INV_STYLES.statBox, { backgroundColor: bg(brand), borderColor: brand + '30' }]}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: brand }}>{summary.totalProducts}</Text>
          <Text style={{ fontSize: 11, color: muted }}>Products</Text>
        </View>
        <View style={[INV_STYLES.statBox, { backgroundColor: bg(brand), borderColor: brand + '30' }]}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: brand }}>{formatCurrency(summary.totalValue).split('.')[0]}</Text>
          <Text style={{ fontSize: 11, color: muted }}>Total Value</Text>
        </View>
        <View style={[INV_STYLES.statBox, { backgroundColor: bg(danger), borderColor: danger + '30' }]}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: danger }}>{summary.lowStockCount}</Text>
          <Text style={{ fontSize: 11, color: muted }}>Low Stock</Text>
        </View>
      </View>
    </View>
  )
}

function bg(c: string) { return c + '12' }

// ── Quick Action Buttons ──────────────────────────────────────────────────────

function QuickActions({ router }: { router: any }) {
  const { card, text, border, brand, success, danger } = useTheme()

  const actions = [
    { label: 'Receive Stock', icon: <Plus size={18} color="#fff" />, color: success, route: '/receive' },
    { label: 'Adjust Stock', icon: <Minus size={18} color="#fff" />, color: brand, route: '/stock' },
    { label: 'Low Stock', icon: <TrendingDown size={18} color="#fff" />, color: danger, route: '/low-stock' },
    { label: 'View Products', icon: <ArrowUpRight size={18} color="#fff" />, color: brand, route: '/products' },
  ]

  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 12 }}>
      {actions.map((a) => (
        <TouchableOpacity
          key={a.label}
          style={{ flex: 1, backgroundColor: a.color, borderRadius: 12, paddingVertical: 14, alignItems: 'center', gap: 6 }}
          onPress={() => router.push(a.route as any)}
        >
          {a.icon}
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11, textAlign: 'center' }}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

// ── Adjust Modal ──────────────────────────────────────────────────────────────

interface AdjustModalState {
  productId: string
  productName: string
  currentStock: number
}

function AdjustModal({
  visible,
  initial,
  onClose,
  onSaved,
}: {
  visible: boolean
  initial: AdjustModalState | null
  onClose: () => void
  onSaved: () => void
}) {
  const { bg: bgColor, card, text, textSecondary: muted, border, brand, success } = useTheme()
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState<string>('Adjustment')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (visible) { setDelta(''); setReason('Adjustment') } }, [visible])

  if (!visible || !initial) return null

  const { productId, productName, currentStock } = initial
  const deltaNum = parseInt(delta) || 0
  const newStock = currentStock + deltaNum

  async function handleSave() {
    if (deltaNum === 0) { Alert.alert('Invalid', 'Enter a non-zero adjustment'); return }
    setSaving(true)
    try {
      await adjustStock(productId, deltaNum, reason)
      onSaved()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to adjust stock'
      Alert.alert('Error', msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
      <View style={{ backgroundColor: card, borderRadius: 16, padding: 20, width: '100%', maxWidth: 340 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: text, marginBottom: 4 }}>Adjust Stock</Text>
        <Text style={{ color: muted, fontSize: 13, marginBottom: 16 }}>{productName}</Text>

        {/* Stock preview */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 16 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: muted }}>Current</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: text }}>{initial.currentStock}</Text>
          </View>
          <ArrowRight size={20} color={muted} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: muted }}>New</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: newStock < 0 ? '#ef4444' : text }}>{newStock}</Text>
          </View>
        </View>

        {/* Delta input */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          <TouchableOpacity
            style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: bgColor, borderWidth: 1, borderColor: border, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => setDelta((d: string) => String(parseInt(d || '0') - 1))}
          >
            <Minus size={20} color={text} />
          </TouchableOpacity>
          <TextInput
            style={{ flex: 1, backgroundColor: bgColor, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontWeight: '800', color: text, textAlign: 'center', borderWidth: 1, borderColor: border }}
            value={delta}
            onChangeText={setDelta}
            keyboardType="number-pad"
            placeholder="+/- quantity"
            placeholderTextColor={muted}
          />
          <TouchableOpacity
            style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: bgColor, borderWidth: 1, borderColor: border, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => setDelta((d: string) => String(parseInt(d || '0') + 1))}
          >
            <Plus size={20} color={text} />
          </TouchableOpacity>
        </View>

        {/* Reason picker */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {STOCK_REASONS.map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setReason(r)}
              style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
                backgroundColor: reason === r ? brand : bgColor,
                borderWidth: 1, borderColor: reason === r ? brand : border,
              }}
            >
              <Text style={{ color: reason === r ? '#fff' : text, fontWeight: '700', fontSize: 12 }}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: saving || deltaNum === 0 ? muted : success, borderRadius: 10, paddingVertical: 13, alignItems: 'center' }} onPress={handleSave} disabled={saving || deltaNum === 0}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>{saving ? 'Saving…' : `Save (+${deltaNum || 0})`}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ paddingVertical: 13, paddingHorizontal: 16, borderRadius: 10, backgroundColor: bgColor, borderWidth: 1, borderColor: border }} onPress={onClose}>
            <Text style={{ color: text }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

// ── Low-Stock Alert Row ────────────────────────────────────────────────────────

function LowStockAlertRow({ product, onAdjust }: { product: { id: string; name: string; stockQuantity: number; threshold: number }; onAdjust: () => void }) {
  const { card, text, textSecondary: muted, border, danger, brand } = useTheme()
  const deficit = product.threshold - product.stockQuantity

  return (
    <View style={[INV_STYLES.alertRow, { backgroundColor: card, borderColor: danger + '40', borderLeftWidth: 3 }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: text }} numberOfLines={1}>{product.name}</Text>
        <Text style={{ fontSize: 12, color: muted }}>Stock: {product.stockQuantity} · Threshold: {product.threshold}</Text>
      </View>
      <Text style={{ fontSize: 13, fontWeight: '800', color: danger, marginRight: 8 }}>−{deficit}</Text>
      <TouchableOpacity style={{ backgroundColor: brand, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }} onPress={onAdjust}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Adjust</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Movement Row ────────────────────────────────────────────────────────────────

function MovementRow({ movement }: { movement: StockMovement }) {
  const { card, text, textSecondary: muted, border, success, danger } = useTheme()
  const isPositive = movement.operation === 'purchase' || movement.operation === 'openingStock' || movement.operation === 'return'
  const sign = isPositive ? '+' : '−'
  const color = isPositive ? success : danger

  const typeLabel: Record<string, string> = {
    sale: 'Sale', purchase: 'Received', adjustment: 'Adjusted', correction: 'Corrected',
    return: 'Returned', damage: 'Damaged', transfer: 'Transfer', openingStock: 'Opening',
  }

  return (
    <View style={[INV_STYLES.movementRow, { backgroundColor: card, borderColor: border }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: text }}>{typeLabel[movement.operation] ?? movement.operation}</Text>
        {movement.notes && <Text style={{ fontSize: 11, color: muted }} numberOfLines={1}>{movement.notes}</Text>}
        <Text style={{ fontSize: 11, color: muted, marginTop: 2 }}>{formatDateTime(movement.timestamp)}</Text>
      </View>
      <Text style={{ fontSize: 16, fontWeight: '800', color }}>{sign}{movement.quantity}</Text>
    </View>
  )
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function InventoryScreen() {
  const router = useRouter()
  const { bg, card, text, textSecondary: muted, border, brand } = useTheme()
  const [summary, setSummary] = useState<{ totalProducts: number; totalValue: number; lowStockCount: number; lowStockProducts: Array<{ id: string; name: string; stockQuantity: number; threshold: number; sellingPrice: number }> } | null>(null)
  const [products, setProducts] = useState<Array<{ id: string; name: string; stockQuantity: number; threshold: number; sellingPrice: number }>>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'movements'>('overview')
  const [adjustTarget, setAdjustTarget] = useState<AdjustModalState | null>(null)

  const load = useCallback(async () => {
    const [s, p, m] = await Promise.all([
      getInventorySummary(),
      getAllProducts(),
      getRecentStockMovements(20),
    ])
    setSummary(s)
    setProducts(p)
    setMovements(m)
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  function openAdjust(productId: string, productName: string, currentStock: number) {
    setAdjustTarget({ productId, productName, currentStock })
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Inventory" />

      {/* Tab switcher */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
        {(['overview', 'movements'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: activeTab === tab ? brand : bg, borderWidth: 1, borderColor: activeTab === tab ? brand : border, alignItems: 'center' }}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={{ color: activeTab === tab ? '#fff' : muted, fontWeight: '700', fontSize: 13, textTransform: 'capitalize' }}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'overview' ? (
        <FlatList
          data={summary?.lowStockProducts ?? []}
          keyExtractor={(item: { id: string }) => item.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand} />}
          ListHeaderComponent={
            <View style={{ gap: 14, marginBottom: 14 }}>
              {summary && <SummaryCard summary={summary} />}
              <QuickActions router={router} />
              {summary && summary.lowStockCount > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <TrendingDown size={14} color="#ef4444" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#ef4444' }}>Low Stock Alerts ({summary.lowStockCount})</Text>
                </View>
              )}
            </View>}
          renderItem={({ item }: { item: { id: string; name: string; stockQuantity: number; threshold: number } }) => (
            <LowStockAlertRow
              product={item}
              onAdjust={() => openAdjust(item.id, item.name, item.stockQuantity)}
            />
          )}
          ListEmptyComponent={
            summary && summary.lowStockCount === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Package size={40} color={muted} />
                <Text style={{ color: muted, marginTop: 8, fontSize: 14, fontWeight: '600' }}>All stock levels healthy</Text>
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={movements}
          keyExtractor={(item: StockMovement) => item.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand} />}
          renderItem={({ item }: { item: StockMovement }) => <MovementRow movement={item} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Package size={40} color={muted} />
              <Text style={{ color: muted, marginTop: 8, fontSize: 14 }}>No stock movements yet</Text>
            </View>
          }
        />
      )}

      <AdjustModal
        visible={!!adjustTarget}
        initial={adjustTarget}
        onClose={() => setAdjustTarget(null)}
        onSaved={onRefresh}
      />
    </SafeAreaView>
  )
}
