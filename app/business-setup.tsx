// app/business-setup.tsx — Phase 07: Business Setup screen
// Accessible to owner/manager only. Form submits to businessSetup() via cloud service.
import React, { useState } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Building2, ChevronRight } from 'lucide-react-native'
import { AppHeader } from '../src/components/shared/app-header'
import { useTheme } from '../src/hooks/useTheme'
import { useBusinessSetup } from '../src/hooks/useBusinessSetup'
import type { BusinessType, BusinessSetupInput } from '../src/types/types-business-setup'

const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: 'retail', label: 'Retail Shop' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'restaurant', label: 'Restaurant / Café' },
  { value: 'salon', label: 'Salon / Beauty' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'other', label: 'Other' },
]

const COUNTRIES = [
  { value: 'KE', label: 'Kenya (KE)' },
  { value: 'TZ', label: 'Tanzania (TZ)' },
  { value: 'UG', label: 'Uganda (UG)' },
  { value: 'NG', label: 'Nigeria (NG)' },
]

const CURRENCIES = [
  { value: 'KES', label: 'KES — Kenyan Shilling' },
  { value: 'TZS', label: 'TZS — Tanzanian Shilling' },
  { value: 'UGX', label: 'UGX — Ugandan Shilling' },
  { value: 'NGN', label: 'NGN — Nigerian Naira' },
]

interface SelectFieldProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  const { text, card, border, textSecondary } = useTheme()
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: text, marginBottom: 6 }}>{label}</Text>
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: card, borderWidth: 1, borderColor: border, borderRadius: 10,
          paddingHorizontal: 12, paddingVertical: 12,
        }}
      >
        <Text style={{ fontSize: 15, color: value ? text : textSecondary }}>
          {selected?.label ?? `Select ${label}`}
        </Text>
        <ChevronRight size={16} color={textSecondary} style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }} />
      </TouchableOpacity>
      {open && (
        <View style={{ marginTop: 4, backgroundColor: card, borderRadius: 10, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => { onChange(opt.value); setOpen(false) }}
              style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: border }}
            >
              <Text style={{ fontSize: 15, color: opt.value === value ? '#f97316' : text }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

interface TextFieldProps {
  label: string
  value: string
  onChange: (text: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'email-address' | 'phone-pad'
  autoCapitalize?: 'none' | 'sentences' | 'words'
  error?: string
}

function TextField({ label, value, onChange, placeholder, keyboardType = 'default', autoCapitalize = 'sentences', error }: TextFieldProps) {
  const { text, card, border, textSecondary } = useTheme()
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: text, marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={textSecondary}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={{
          fontSize: 15, color: text,
          backgroundColor: card, borderWidth: 1,
          borderColor: error ? '#ef4444' : border,
          borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
        }}
      />
      {error && <Text style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{error}</Text>}
    </View>
  )
}

export default function BusinessSetupScreen() {
  const { bg, text, border, card, brand, textSecondary } = useTheme()
  const { loading, error, success, submit } = useBusinessSetup()

  const [form, setForm] = useState<Omit<BusinessSetupInput, 'country' | 'currency'>>({
    businessName: '',
    businessType: 'retail',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
  })
  const [country, setCountry] = useState('KE')
  const [currency, setCurrency] = useState('KES')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function update(field: keyof Omit<BusinessSetupInput, 'country' | 'currency'>, value: string) {
    setForm((f: Omit<BusinessSetupInput, 'country' | 'currency'>) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e: Record<string, string>) => ({ ...e, [field]: '' }))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.businessName.trim() || form.businessName.trim().length < 2) {
      errs.businessName = 'Business name must be at least 2 characters'
    }
    if (!form.ownerName.trim()) {
      errs.ownerName = 'Owner full name is required'
    }
    if (!form.ownerPhone.trim()) {
      errs.ownerPhone = 'Owner phone is required'
    } else if (!/^\+?[1-9]\d{6,14}$/.test(form.ownerPhone.replace(/\s/g, ''))) {
      errs.ownerPhone = 'Enter a valid phone number (E.164 format)'
    }
    if (form.ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.ownerEmail)) {
      errs.ownerEmail = 'Enter a valid email address'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    const input: BusinessSetupInput = { ...form, country, currency }
    const result = await submit(input)
    if (result) {
      Alert.alert(
        'Business Created',
        `Business "${form.businessName}" has been set up successfully.\n\nBusiness ID: ${result.businessId.slice(0, 8)}…\nDefault category created.`,
        [{ text: 'OK', onPress: () => router.back() }]
      )
    }
  }

  if (success) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
        <AppHeader title="Business Setup" showBell={false} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#22c55e20', justifyContent: 'center', alignItems: 'center' }}>
            <Building2 size={28} color="#22c55e" />
          </View>
          <Text style={{ marginTop: 16, fontSize: 18, fontWeight: '800', color: text, textAlign: 'center' }}>
            Business Created!
          </Text>
          <Text style={{ marginTop: 8, fontSize: 14, color: textSecondary, textAlign: 'center' }}>
            {form.businessName} is ready to trade.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Business Setup" showBell={false} showSync={false} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Banner */}
          <View style={{ backgroundColor: brand + '15', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: brand + '30', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Building2 size={20} color={brand} />
            <Text style={{ flex: 1, fontSize: 13, color: text, fontWeight: '500' }}>
              Set up your business to start trading. Only owners and managers can access this screen.
            </Text>
          </View>

          {/* Business info */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: text, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Business Information
          </Text>
          <TextField
            label="Business Name *"
            value={form.businessName}
            onChange={v => update('businessName', v)}
            placeholder="e.g. Kimani Retail Shop"
            error={errors.businessName}
          />
          <SelectField
            label="Business Type"
            value={form.businessType}
            options={BUSINESS_TYPES}
            onChange={v => update('businessType', v as BusinessType)}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <SelectField
                label="Country"
                value={country}
                options={COUNTRIES}
                onChange={v => setCountry(v)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <SelectField
                label="Currency"
                value={currency}
                options={CURRENCIES}
                onChange={v => setCurrency(v)}
              />
            </View>
          </View>

          {/* Owner info */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: text, marginBottom: 4, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Owner Information
          </Text>
          <TextField
            label="Owner Full Name *"
            value={form.ownerName}
            onChange={v => update('ownerName', v)}
            placeholder="e.g. Jane Wanjiku"
            autoCapitalize="words"
            error={errors.ownerName}
          />
          <TextField
            label="Owner Phone *"
            value={form.ownerPhone}
            onChange={v => update('ownerPhone', v)}
            placeholder="+254712345678"
            keyboardType="phone-pad"
            error={errors.ownerPhone}
          />
          <TextField
            label="Owner Email (optional)"
            value={form.ownerEmail}
            onChange={v => update('ownerEmail', v)}
            placeholder="jane@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.ownerEmail}
          />

          {/* Error */}
          {error && (
            <View style={{ backgroundColor: '#fef2f2', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#fecaca' }}>
              <Text style={{ fontSize: 13, color: '#dc2626', fontWeight: '600' }}>Setup Failed</Text>
              <Text style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={{
              backgroundColor: loading ? brand + '60' : brand,
              borderRadius: 12, paddingVertical: 16,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
              marginTop: 8,
            }}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Building2 size={18} color="#fff" /><Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>Create Business</Text></>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
