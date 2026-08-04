// Shared inventory wizard shell — used by both Add and Edit forms
import { useState, useCallback } from 'react'
import {
  View, Text, TouchableOpacity,
  Modal, Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { X, ChevronRight, ChevronLeft } from 'lucide-react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../../hooks/useTheme'
import type { Category } from '../../lib/types'
import { BarcodeScannerModal } from '../shared/barcode-scanner-modal'
import { renderTypeStep } from './step-type'
import { renderDetailsStep } from './step-details'
import { renderPricingStep } from './step-pricing'
import { renderDistributorStep } from './step-distributor'
import { renderBarcodeStep } from './step-barcode'
import type { ProductType } from './inventory-types'

interface GroupPrice {
  name: string; price: string; minQuantity: string
}

interface Props {
  visible: boolean
  onClose: () => void
  onSaved: () => void
  isEdit?: boolean
  initialForm?: Record<string, any>
  onSave: (form: Record<string, any>) => Promise<void>
}

const STEP_LABELS = ['Type', 'Details', 'Pricing', 'Distributor', 'Barcode']

export function InventoryWizard({ visible, onClose, onSaved, isEdit, initialForm, onSave }: Props) {
  const { bg, card, text, textSecondary: muted, border, brand: orange, success, danger } = useTheme()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Record<string, any>>(initialForm || makeInit())
  const [categories, setCategories] = useState<Category[]>([])
  const [showCatInput, setShowCatInput] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const loadCategories = useCallback(async () => {
    const { getAllCategories } = await import('../../services/db-categories')
    setCategories(await getAllCategories())
  }, [])

  const open = () => { setForm(initialForm || makeInit()); setStep(0); setErrors({}); loadCategories() }
  const close = () => { setForm({}); setStep(0); setErrors({}); onClose() }

  const set = (k: string, v: any) => {
    setForm((f: Record<string, any>) => ({ ...f, [k]: v }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setErrors((e: Record<string, string>) => ({ ...e, [k]: undefined }) as any)
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (step === 1 && !form.name?.trim()) e.name = 'Required'
    if (step === 2 && !form.sellingPrice) e.sellingPrice = 'Required'
    if (step === 2 && !form.costPrice) e.costPrice = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() { if (!validate()) return; setStep((s) => Math.min(s + 1, 4)) }
  function back() { setStep((s) => Math.max(s - 1, 0)) }

  function addGroupPrice() {
    setForm((f: any) => ({ ...f, groupPrices: [...(f.groupPrices || []), { name: '', price: '', minQuantity: '' }] }))
  }
  function removeGroupPrice(i: number) {
    setForm((f: any) => ({ ...f, groupPrices: f.groupPrices.filter((_: any, idx: number) => idx !== i) }))
  }
  function updateGroupPrice(i: number, field: keyof GroupPrice, value: string) {
    setForm((f: any) => ({
      ...f,
      groupPrices: f.groupPrices.map((gp: GroupPrice, idx: number) =>
        idx === i ? { ...gp, [field]: value } : gp
      ),
    }))
  }

  async function addCategory() {
    if (!newCatName.trim()) return
    const { createCategory: cc } = await import('../../services/db-categories')
    const cat = await cc({ name: newCatName.trim(), color: '#f97316', isActive: true })
    setCategories((cs) => [...cs, cat])
    setForm((f: any) => ({ ...f, categoryId: cat.id, categoryName: cat.name, categoryColor: cat.color }))
    setNewCatName(''); setShowCatInput(false)
  }

  function selectCategory(cat: Category) {
    setForm((f: any) => ({ ...f, categoryId: cat.id, categoryName: cat.name, categoryColor: cat.color }))
  }

  function generateBarcode() {
    setForm((f: any) => ({ ...f, barcode: `SOO${Date.now()}${Math.floor(Math.random() * 1000)}` }))
  }

  async function handleSubmit() {
    if (!form.name?.trim()) { Alert.alert('Required', 'Product name is required'); return }
    setSaving(true)
    try { await onSave(form); onSaved(); close() }
    catch { Alert.alert('Error', `Failed to ${isEdit ? 'update' : 'add'} product`) }
    finally { setSaving(false) }
  }

  const c = { bg, card, text, textSecondary: muted, border, brand: orange, success, danger }

  function renderContent() {
    switch (step) {
      case 0: return <>{renderTypeStep({ productType: form.productType, set, c })}</>
      case 1: return <>{renderDetailsStep({ form, set, c, categories, showCatInput, setShowCatInput, newCatName, setNewCatName, onAddCategory: addCategory, onSelectCategory: selectCategory, errors })}</>
      case 2: return <>{renderPricingStep({ form, set, c, errors, onAddGroupPrice: addGroupPrice, onRemoveGroupPrice: removeGroupPrice, onUpdateGroupPrice: updateGroupPrice, isEdit: !!isEdit })}</>
      case 3: return <>{renderDistributorStep({ form, set, c })}</>
      case 4: return <>{renderBarcodeStep({ form, set, c, onScan: () => setShowScanner(true), onGenerate: generateBarcode, isEdit: !!isEdit })}</>
      default: return null
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onShow={open} onRequestClose={close}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={step > 0 ? back : close} style={styles.iconBtn}>
                {step > 0 ? <ChevronLeft size={20} color={text} /> : <X size={20} color={text} />}
              </TouchableOpacity>
              <Text style={{ fontSize: 17, fontWeight: '800', color: text }}>{isEdit ? 'Edit Product' : 'Add Product'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {STEP_LABELS.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: i === step ? orange : i < step ? success : border,
                    marginHorizontal: 2,
                  }}
                />
              ))}
            </View>
          </View>

          {/* Step label */}
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
            <Text style={{ color: muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
              Step {step + 1} of 5 — {STEP_LABELS[step]}
            </Text>
          </View>

          {/* Content */}
          <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
            {renderContent()}
          </View>

          {/* Footer */}
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: border }}>
            {step < 4 ? (
              <TouchableOpacity style={{ backgroundColor: orange, borderRadius: 10, paddingVertical: 14, alignItems: 'center' }} onPress={next}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Next <ChevronRight size={16} color="#fff" style={{ marginLeft: 4 }} /></Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={{ backgroundColor: saving ? muted : success, borderRadius: 10, paddingVertical: 14, alignItems: 'center' }} onPress={handleSubmit} disabled={saving}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Product'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(code) => { set('barcode', code); setShowScanner(false) }}
      />
    </Modal>
  )
}

function makeInit() {
  return {
    productType: 'loose' as ProductType,
    name: '', sku: '', barcode: '',
    categoryId: '', categoryName: '', categoryColor: '#f97316',
    unit: 'piece',
    costPrice: '', sellingPrice: '',
    allowSingleUnitSale: true,
    unitsPerPackage: '', boxBuyingPrice: '',
    groupPrices: [] as GroupPrice[],
    stockQuantity: '', lowStockThreshold: '10',
    trackInventory: true,
    distributorName: '', distributorPhone: '',
  }
}

const styles = StyleSheet.create({
  iconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
})
