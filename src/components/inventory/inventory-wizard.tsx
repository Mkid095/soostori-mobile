// inventory-wizard.tsx — Shared inventory wizard shell
import { useState } from 'react'
import { View, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../../hooks/useTheme'
import { useWizardState } from '../../hooks/useWizardState'
import { WizardModals } from './wizard-modals'
import { WizardHeader } from './wizard-header'
import { WizardFooter } from './wizard-footer'
import { renderTypeStep } from './step-type'
import { renderDetailsStep } from './step-details'
import { renderPricingStep } from './step-pricing'
import { renderDistributorStep } from './step-distributor'
import { renderBarcodeStep } from './step-barcode'
import { renderVariationsStep } from './step-variations'
import type { WizardProps } from './wizard-types'

export function InventoryWizard(props: WizardProps) {
  const { visible, onClose, onSaved, isEdit, onSave } = props
  const { bg, card, text, textSecondary: muted, border, brand: orange, success, danger } = useTheme()
  const c = { bg, card, text, textSecondary: muted, border, brand: orange, success, danger }
  const wizard = useWizardState({ ...props, onClose })
  const [showAddCat, setShowAddCat] = useState(false)

  function renderContent() {
    const { step, form, set } = wizard
    const formRecord = form as unknown as Record<string, unknown>
    switch (step) {
      case 0: return <>{renderTypeStep({ productType: form.productType, set, c })}</>
      case 1: return <>{renderDetailsStep({ form: formRecord, set, c, categories: wizard.categories, onSelectCategory: wizard.selectCategory, onAddCategory: () => setShowAddCat(true), errors: wizard.errors, onOpenCategoryPicker: () => wizard.setShowCatPicker(true), onOpenUnitPicker: () => wizard.setShowUnitPicker(true), onSelectSuggestion: props.onSelectSuggestion })}</>
      case 2: return <>{renderPricingStep({ form: formRecord, set, c, errors: wizard.errors, onAddGroupPrice: wizard.addGroupPrice, onRemoveGroupPrice: wizard.removeGroupPrice, onUpdateGroupPrice: wizard.updateGroupPrice, isEdit: !!isEdit })}</>
      case 3: return <>{renderDistributorStep({ form: formRecord, set, c })}</>
      case 4: return <>{renderBarcodeStep({ form: formRecord, set, c, onScan: () => wizard.setShowScanner(true), onGenerate: wizard.generateBarcode, isEdit: !!isEdit })}</>
      case 5: return <>{renderVariationsStep({ variants: wizard.variants, onAdd: wizard.addVariant, onRemove: wizard.removeVariant, onUpdate: wizard.updateVariant, onStockChange: wizard.updateVariantStock, c })}</>
      default: return null
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onShow={wizard.open} onRequestClose={wizard.close}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1 }}>
          <WizardHeader step={wizard.step} isEdit={!!isEdit} onBack={wizard.back} onClose={wizard.close} c={c} />
          <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>{renderContent()}</View>
          <WizardFooter step={wizard.step} isEdit={!!isEdit} saving={wizard.saving} onBack={wizard.back} onNext={wizard.next} onSubmit={() => wizard.handleSubmit(wizard.variants)} c={c} />
        </SafeAreaView>
      </KeyboardAvoidingView>
      <WizardModals
        c={c}
        showScanner={wizard.showScanner} showCatPicker={wizard.showCatPicker} showUnitPicker={wizard.showUnitPicker}
        showAddCat={showAddCat} categories={wizard.categories} selectedCategoryId={wizard.form.categoryId}
        selectedUnit={wizard.form.unit}
        onCloseScanner={() => wizard.setShowScanner(false)} onCloseCatPicker={() => wizard.setShowCatPicker(false)}
        onCloseUnitPicker={() => wizard.setShowUnitPicker(false)} onCloseAddCat={() => setShowAddCat(false)}
        onScan={(code) => { wizard.set('barcode', code); wizard.setShowScanner(false) }}
        onSelectCategory={wizard.selectCategory} onSelectUnit={(unit) => wizard.set('unit', unit)}
        onCreateCategory={async (name, color) => {
          const { createCategory: cc } = await import('../../services/db-categories')
          const cat = await cc({ name, color, isActive: true })
          wizard.setForm((f) => ({ ...f, categoryId: cat.id, categoryName: cat.name, categoryColor: cat.color }))
          setShowAddCat(false)
        }}
        setShowScanner={wizard.setShowScanner} setShowCatPicker={wizard.setShowCatPicker}
        setShowUnitPicker={wizard.setShowUnitPicker} setShowAddCat={setShowAddCat}
      />
    </Modal>
  )
}
