// Shared inventory wizard shell — used by both Add and Edit forms
import { useState, useCallback } from 'react'
import { View, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../../hooks/useTheme'
import type { Category } from '../../lib/types'
import { BarcodeScannerModal } from '../shared/barcode-scanner-modal'
import { CategoryPickerModal } from './category-picker-modal'
import { WizardHeader } from './wizard-header'
import { WizardFooter } from './wizard-footer'
import { renderTypeStep } from './step-type'
import { renderDetailsStep } from './step-details'
import { renderPricingStep } from './step-pricing'
import { renderDistributorStep } from './step-distributor'
import { renderBarcodeStep } from './step-barcode'
import type { ProductForm, GroupPrice, WizardProps } from './wizard-types'
import { makeInit } from './wizard-types'

export function InventoryWizard({ visible, onClose, onSaved, isEdit, initialForm, onSave }: WizardProps) {
  const { bg, card, text, textSecondary: muted, border, brand: orange, success, danger } = useTheme()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<ProductForm>({ ...makeInit(), ...initialForm })
  const [categories, setCategories] = useState<Category[]>([])
  const [showCatPicker, setShowCatPicker] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const c = { bg, card, text, textSecondary: muted, border, brand: orange, success, danger }

  const loadCategories = useCallback(async () => {
    const { getAllCategories } = await import('../../services/db-categories')
    setCategories(await getAllCategories())
  }, [])

  const open = () => {
    setForm({ ...makeInit(), ...initialForm })
    setStep(0)
    setErrors({})
    loadCategories()
  }
  const close = () => { setForm(makeInit()); setStep(0); setErrors({}); onClose() }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function set(k: string, v: any) {
    setForm((f) => ({ ...f, [k]: v }))
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
    setForm((f) => ({ ...f, groupPrices: [...f.groupPrices, { name: '', price: '', minQuantity: '' }] }))
  }
  function removeGroupPrice(i: number) {
    setForm((f) => ({ ...f, groupPrices: f.groupPrices.filter((_, idx) => idx !== i) }))
  }
  function updateGroupPrice(i: number, field: keyof GroupPrice, value: string) {
    setForm((f) => ({
      ...f,
      groupPrices: f.groupPrices.map((gp, idx) => idx === i ? { ...gp, [field]: value } : gp),
    }))
  }

  async function addCategory() {
    if (!newCatName.trim()) return
    const { createCategory: cc } = await import('../../services/db-categories')
    const cat = await cc({ name: newCatName.trim(), color: '#f97316', isActive: true })
    setCategories((cs) => [...cs, cat])
    setForm((f) => ({ ...f, categoryId: cat.id, categoryName: cat.name, categoryColor: cat.color }))
    setNewCatName('')
  }

  function selectCategory(cat: Category) {
    setForm((f) => ({ ...f, categoryId: cat.id, categoryName: cat.name, categoryColor: cat.color }))
  }

  function generateBarcode() {
    setForm((f) => ({ ...f, barcode: `SOO${Date.now()}${Math.floor(Math.random() * 1000)}` }))
  }

  async function handleSubmit() {
    if (!form.name?.trim()) { Alert.alert('Required', 'Product name is required'); return }
    setSaving(true)
    try {
      await onSave(form)
      onSaved()
      close()
    } catch {
      Alert.alert('Error', `Failed to ${isEdit ? 'update' : 'add'} product`)
    } finally {
      setSaving(false)
    }
  }

  function renderContent(): React.ReactNode {
    switch (step) {
      case 0: return <>{renderTypeStep({ productType: form.productType, set, c })}</>
      case 1: return <>{renderDetailsStep({
        form: form as unknown as Record<string, unknown>, set, c, categories,
        onSelectCategory: selectCategory,
        onAddCategory: addCategory,
        errors,
        onOpenCategoryPicker: () => setShowCatPicker(true),
      })}</>
      case 2: return <>{renderPricingStep({
        form: form as unknown as Record<string, unknown>, set, c, errors,
        onAddGroupPrice: addGroupPrice,
        onRemoveGroupPrice: removeGroupPrice,
        onUpdateGroupPrice: updateGroupPrice,
        isEdit: !!isEdit,
      })}</>
      case 3: return <>{renderDistributorStep({
        form: form as unknown as Record<string, unknown>, set, c,
      })}</>
      case 4: return <>{renderBarcodeStep({
        form: form as unknown as Record<string, unknown>, set, c,
        onScan: () => setShowScanner(true),
        onGenerate: generateBarcode,
        isEdit: !!isEdit,
      })}</>
      default: return null
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onShow={open} onRequestClose={close}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1 }}>
          <WizardHeader
            step={step}
            isEdit={!!isEdit}
            onBack={back}
            onClose={close}
            c={c}
          />

          <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
            {renderContent()}
          </View>

          <WizardFooter
            step={step}
            isEdit={!!isEdit}
            saving={saving}
            onBack={back}
            onNext={next}
            onSubmit={handleSubmit}
            c={c}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>

      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(code) => { set('barcode', code); setShowScanner(false) }}
      />

      <CategoryPickerModal
        visible={showCatPicker}
        onClose={() => setShowCatPicker(false)}
        categories={categories}
        selectedId={form.categoryId}
        onSelect={selectCategory}
        onAddNew={() => { setNewCatName(''); /* open add category flow */ }}
      />
    </Modal>
  )
}
