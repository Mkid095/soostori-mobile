// wizard-modals.tsx — All wizard sub-modals in one place
import { BarcodeScannerModal } from '../shared/barcode-scanner-modal'
import { CategoryPickerModal } from './category-picker-modal'
import { UnitPickerModal } from './unit-picker-modal'
import { AddCategoryDialog } from './add-category-dialog'
import type { Category } from '../../lib/types'

interface WizardModalsProps {
  c: Record<string, string>
  showScanner: boolean
  showCatPicker: boolean
  showUnitPicker: boolean
  showAddCat: boolean
  categories: Category[]
  selectedCategoryId?: string
  selectedUnit?: string
  onCloseScanner: () => void
  onCloseCatPicker: () => void
  onCloseUnitPicker: () => void
  onCloseAddCat: () => void
  onScan: (code: string) => void
  onSelectCategory: (cat: Category) => void
  onSelectUnit: (unit: string) => void
  onCreateCategory: (name: string, color: string) => void
  setShowScanner: (v: boolean) => void
  setShowCatPicker: (v: boolean) => void
  setShowUnitPicker: (v: boolean) => void
  setShowAddCat: (v: boolean) => void
}

export function WizardModals(props: WizardModalsProps) {
  const { c } = props
  return (
    <>
      <BarcodeScannerModal visible={props.showScanner} onClose={props.onCloseScanner} onScan={(code) => { props.onScan(code); props.onCloseScanner() }} />
      <CategoryPickerModal visible={props.showCatPicker} onClose={props.onCloseCatPicker} categories={props.categories} selectedId={props.selectedCategoryId} onSelect={props.onSelectCategory} c={c} />
      <UnitPickerModal visible={props.showUnitPicker} onClose={props.onCloseUnitPicker} selectedUnit={props.selectedUnit ?? 'piece'} onSelect={props.onSelectUnit} />
      <AddCategoryDialog visible={props.showAddCat} onClose={props.onCloseAddCat} onCreated={props.onCreateCategory} c={c} />
    </>
  )
}
