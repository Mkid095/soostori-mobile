// useWizardState — form state management for inventory wizard
import { useState, useCallback } from 'react'
import type { Category } from '../lib/types'
import type { ProductForm, GroupPrice, WizardProps } from '../components/inventory/wizard-types'
import { makeInit } from '../components/inventory/wizard-types'
import type { VariantRow } from '../components/inventory/step-variations'
import { generateId } from '../lib/formatters'

export function useWizardState({ initialForm, onSave, isEdit, onSaved, onClose }: WizardProps) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<ProductForm>({ ...makeInit(), ...initialForm })
  const [categories, setCategories] = useState<Category[]>([])
  const [showCatPicker, setShowCatPicker] = useState(false)
  const [showUnitPicker, setShowUnitPicker] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [variants, setVariants] = useState<VariantRow[]>([])

  const loadCategories = useCallback(async () => {
    const { getAllCategories } = await import('../services/db-categories')
    setCategories(await getAllCategories())
  }, [])

  const open = useCallback(() => {
    setForm({ ...makeInit(), ...initialForm } as ProductForm)
    setStep(0)
    setErrors({})
    setVariants([])
    loadCategories()
  }, [initialForm, loadCategories])

  const close = useCallback(() => {
    setForm(makeInit())
    setStep(0)
    setErrors({})
    onClose()
  }, [onClose])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set = useCallback((k: string, v: any) => {
    setForm((f) => ({ ...f, [k]: v }))
  }, [])

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {}
    if (step === 1 && !form.name?.trim()) e.name = 'Required'
    if (step === 2 && !form.sellingPrice) e.sellingPrice = 'Required'
    if (step === 2 && !form.costPrice) e.costPrice = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }, [step, form])

  const next = useCallback(() => {
    if (!validate()) return
    setStep((s) => Math.min(s + 1, 5))
  }, [validate])

  const back = useCallback(() => setStep((s) => Math.max(s - 1, 0)), [])

  const addGroupPrice = useCallback(() => {
    setForm((f) => ({ ...f, groupPrices: [...f.groupPrices, { name: '', price: '', minQuantity: '' }] }))
  }, [])

  const removeGroupPrice = useCallback((i: number) => {
    setForm((f) => ({ ...f, groupPrices: f.groupPrices.filter((_, idx) => idx !== i) }))
  }, [])

  const updateGroupPrice = useCallback((i: number, field: keyof GroupPrice, value: string) => {
    setForm((f) => ({
      ...f,
      groupPrices: f.groupPrices.map((gp, idx) => idx === i ? { ...gp, [field]: value } : gp),
    }))
  }, [])

  const addCategory = useCallback(async () => {
    // This is handled in the wizard component with access to newCatName state
  }, [])

  const selectCategory = useCallback((cat: Category) => {
    setForm((f) => ({ ...f, categoryId: cat.id, categoryName: cat.name, categoryColor: cat.color }))
  }, [])

  const generateBarcode = useCallback(() => {
    setForm((f) => ({ ...f, barcode: `SOO${Date.now()}${Math.floor(Math.random() * 1000)}` }))
  }, [])

  const addVariant = useCallback(() => {
    setVariants((v) => [...v, { id: generateId(), name: '', sku: '', barcode: '', sellingPrice: '', costPrice: '', stockQuantity: '' }])
  }, [])

  const removeVariant = useCallback((i: number) => {
    setVariants((v) => v.filter((_, idx) => idx !== i))
  }, [])

  const updateVariant = useCallback((i: number, field: keyof VariantRow, value: string) => {
    setVariants((v) => v.map((vr, idx) => idx === i ? { ...vr, [field]: value } : vr))
  }, [])

  const handleSubmit = useCallback(async (variants: VariantRow[]) => {
    if (!form.name?.trim()) return
    setSaving(true)
    try {
      await onSave(form, variants)
      onSaved()
      close()
    } catch {
      setSaving(false)
      throw new Error(`Failed to ${isEdit ? 'update' : 'add'} product`)
    }
  }, [form, onSave, onSaved, close, isEdit])

  return {
    step, form, categories, showCatPicker, showUnitPicker, showScanner, saving, errors, variants,
    setForm, setStep, setShowCatPicker, setShowUnitPicker, setShowScanner, setSaving: setSaving,
    open, close, set, next, back,
    addGroupPrice, removeGroupPrice, updateGroupPrice,
    selectCategory, generateBarcode, handleSubmit,
    addVariant, removeVariant, updateVariant,
  }
}
