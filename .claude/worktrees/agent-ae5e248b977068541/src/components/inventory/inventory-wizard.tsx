// Shared inventory wizard shell — used by both Add and Edit forms
import { useState } from 'react'
import { View, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../../hooks/useTheme'
import { useWizardState } from '../../hooks/useWizardState'
import type { Category } from '../../lib/types'
import { BarcodeScannerModal } from '../shared/barcode-scanner-modal'
import { CategoryPickerModal } from './category-picker-modal'
import { UnitPickerModal } from './unit-picker-modal'
import { WizardHeader } from './wizard-header'
import { WizardFooter } from './wizard-footer'
import { AddCategoryDialog } from './add-category-dialog'
import { renderTypeStep } from './step-type'
import { renderDetailsStep } from './step-details'
import { renderPricingStep } from './step-pricing'
import { renderDistributorStep } from './step-distributor'
import { renderBarcodeStep } from './step-barcode'
import { renderVariationsStep } from './step-variations'
import type { WizardProps } from './wizard-types'

export function InventoryWizard(props: WizardProps) {
  const { visible, onClose, onSaved, isEdit, initialForm, onSave } = props
  const { bg, card, text, textSecondary: muted, border, brand: orange, success, danger } = useTheme()
  const [showAddCatDialog, setShowAddCatDialog] = useState(false)

  const c = { bg, card, text, textSecondary: muted, border, brand: orange, success, danger }

  const wizard = useWizardState({ ...props, onClose })

  async function createCategory(name: string, color: string) {
    const { createCategory: cc } = await import('../../services/db-categories')
    const cat = await cc({ name, color, isActive: true })
    wizard.setForm((f) => ({ ...f, categoryId: cat.id, categoryName: cat.name, categoryColor: cat.color }))
  }

  function selectCategory(cat: Category) {
    wizard.setForm((f) => ({ ...f, categoryId: cat.id, categoryName: cat.name, categoryColor: cat.color }))
  }

  function renderContent() {
    const { step, form } = wizard
    const { set } = wizard
    switch (step) {
      case 0: return <>{renderTypeStep({ productType: form.productType, set, c })}</>
      case 1: return <>{renderDetailsStep({
        form: form as unknown as Record<string, unknown>, set, c,
        categories: wizard.categories,
        onSelectCategory: selectCategory,
        onAddCategory: () => setShowAddCatDialog(true),
        errors: wizard.errors,
        onOpenCategoryPicker: () => wizard.setShowCatPicker(true),
        onOpenUnitPicker: () => wizard.setShowUnitPicker(true),
        onSelectSuggestion: props.onSelectSuggestion,
      })}</>
      case 2: return <>{renderPricingStep({
        form: form as unknown as Record<string, unknown>, set, c, errors: wizard.errors,
        onAddGroupPrice: wizard.addGroupPrice,
        onRemoveGroupPrice: wizard.removeGroupPrice,
        onUpdateGroupPrice: wizard.updateGroupPrice,
        isEdit: !!isEdit,
      })}</>
      case 3: return <>{renderDistributorStep({
        form: form as unknown as Record<string, unknown>, set, c,
      })}</>
      case 4: return <>{renderBarcodeStep({
        form: form as unknown as Record<string, unknown>, set, c,
        onScan: () => wizard.setShowScanner(true),
        onGenerate: wizard.generateBarcode,
        isEdit: !!isEdit,
      })}</>
      case 5: return <>{renderVariationsStep({
        variants: wizard.variants,
        onAdd: wizard.addVariant,
        onRemove: wizard.removeVariant,
        onUpdate: wizard.updateVariant,
        c,
      })}</>
      default: return null
    }
  }

  async function handleSubmit() {
    if (!wizard.form.name?.trim()) { Alert.alert('Required', 'Product name is required'); return }
    wizard.setSaving(true)
    try {
      await onSave(wizard.form, wizard.variants)
      onSaved()
      wizard.close()
    } catch {
      wizard.setSaving(false)
      Alert.alert('Error', `Failed to ${isEdit ? 'update' : 'add'} product`)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onShow={wizard.open} onRequestClose={wizard.close}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1 }}>
          <WizardHeader
            step={wizard.step}
            isEdit={!!isEdit}
            onBack={wizard.back}
            onClose={wizard.close}
            c={c}
          />

          <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
            {renderContent()}
          </View>

          <WizardFooter
            step={wizard.step}
            isEdit={!!isEdit}
            saving={wizard.saving}
            onBack={wizard.back}
            onNext={wizard.next}
            onSubmit={handleSubmit}
            c={c}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>

      <BarcodeScannerModal
        visible={wizard.showScanner}
        onClose={() => wizard.setShowScanner(false)}
        onScan={(code) => { wizard.set('barcode', code); wizard.setShowScanner(false) }}
      />

      <CategoryPickerModal
        visible={wizard.showCatPicker}
        onClose={() => wizard.setShowCatPicker(false)}
        categories={wizard.categories}
        selectedId={wizard.form.categoryId}
        onSelect={selectCategory}
        c={c}
      />

      <UnitPickerModal
        visible={wizard.showUnitPicker}
        onClose={() => wizard.setShowUnitPicker(false)}
        selectedUnit={wizard.form.unit}
        onSelect={(unit) => wizard.set('unit', unit)}
      />

      <AddCategoryDialog
        visible={showAddCatDialog}
        onClose={() => setShowAddCatDialog(false)}
        onCreated={createCategory}
        c={c}
      />
    </Modal>
  )
}
