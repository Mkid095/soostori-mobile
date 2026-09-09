// PaymentChannelsSection — desktop-style payment type selector
// Shows one payment type at a time with its required fields.
import { View, Text, TouchableOpacity, TextInput } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import type { ShopSettings } from '../../lib/types'
import { updateShopSettings } from '../../services/db-settings'
import { PaymentPhoneField } from './payment-phone-field'
import { PaymentPaybillField } from './payment-paybill-field'

type PaymentType = 'sendMoney' | 'mpesaPaybill' | 'bankPaybill' | 'pochi'

interface Props {
  settings: ShopSettings
}

const TYPES: { value: PaymentType; label: string; hint: string }[] = [
  { value: 'sendMoney',   label: 'M-Pesa Send Money',    hint: 'Customer sends money to your phone number' },
  { value: 'mpesaPaybill', label: 'M-Pesa Paybill',      hint: 'Customer pays via M-Pesa paybill number + account' },
  { value: 'bankPaybill',  label: 'Bank Paybill',         hint: 'Customer pays via bank paybill number + account' },
  { value: 'pochi',        label: 'Pochi La Biashara',    hint: 'Customer pays via Pochi to your phone number' },
]

export function PaymentChannelsSection({ settings }: Props) {
  const { card, text, textSecondary: textMuted, border, brand } = useTheme()

  function getActiveType(): PaymentType {
    if (settings.mpesaSendMoneyPhone) return 'sendMoney'
    if (settings.mpesaPaybillNumber)  return 'mpesaPaybill'
    if (settings.bankPaybillNumber)   return 'bankPaybill'
    if (settings.mpesaPochiPhone)     return 'pochi'
    return 'sendMoney'
  }

  async function handleTypeChange(type: PaymentType) {
    if (type === 'sendMoney')    await updateShopSettings({ mpesaSendMoneyPhone: settings.mpesaSendMoneyPhone || '' })
    if (type === 'mpesaPaybill') await updateShopSettings({ mpesaPaybillNumber: settings.mpesaPaybillNumber || '', mpesaPaybillAccount: settings.mpesaPaybillAccount || '' })
    if (type === 'bankPaybill')  await updateShopSettings({ bankPaybillNumber: settings.bankPaybillNumber || '', bankPaybillAccount: settings.bankPaybillAccount || '' })
    if (type === 'pochi')        await updateShopSettings({ mpesaPochiPhone: settings.mpesaPochiPhone || '' })
  }

  async function handlePhoneChange(value: string) {
    const t = getActiveType()
    if (t === 'sendMoney') await updateShopSettings({ mpesaSendMoneyPhone: value })
    else if (t === 'pochi') await updateShopSettings({ mpesaPochiPhone: value })
  }

  async function handlePaybillNumChange(value: string) {
    const t = getActiveType()
    if (t === 'mpesaPaybill') await updateShopSettings({ mpesaPaybillNumber: value })
    else if (t === 'bankPaybill') await updateShopSettings({ bankPaybillNumber: value })
  }

  async function handleAccountChange(value: string) {
    const t = getActiveType()
    if (t === 'mpesaPaybill') await updateShopSettings({ mpesaPaybillAccount: value })
    else if (t === 'bankPaybill') await updateShopSettings({ bankPaybillAccount: value })
  }

  const activeType = getActiveType()
  const showPhone   = activeType === 'sendMoney' || activeType === 'pochi'
  const showPaybill = activeType === 'mpesaPaybill' || activeType === 'bankPaybill'

  return (
    <View style={{ gap: 16 }}>
      <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
        <Text style={{ fontSize: 13, color: textMuted, marginBottom: 12 }}>
          Select one payment type. Only one can be active at a time.
        </Text>
        <View style={{ gap: 8 }}>
          {TYPES.map((t) => {
            const active = activeType === t.value
            return (
              <TouchableOpacity
                key={t.value}
                onPress={() => handleTypeChange(t.value)}
                style={{
                  backgroundColor: active ? brand : 'transparent',
                  borderRadius: 10, padding: 12,
                  borderWidth: 1.5, borderColor: active ? brand : border,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#fff' : text }}>
                  {t.label}
                </Text>
                {!active && <Text style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>{t.hint}</Text>}
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {showPhone && (
        <PaymentPhoneField
          label={activeType === 'pochi' ? 'Pochi Phone Number' : 'Your M-Pesa Phone Number'}
          value={activeType === 'sendMoney' ? (settings.mpesaSendMoneyPhone || '') : (settings.mpesaPochiPhone || '')}
          onChangeText={handlePhoneChange}
        />
      )}

      {showPaybill && (
        <PaymentPaybillField
          label={activeType === 'bankPaybill' ? 'Bank Paybill Number' : 'M-Pesa Paybill Number'}
          paybillNum={activeType === 'mpesaPaybill' ? (settings.mpesaPaybillNumber || '') : (settings.bankPaybillNumber || '')}
          account={activeType === 'mpesaPaybill' ? (settings.mpesaPaybillAccount || '') : (settings.bankPaybillAccount || '')}
          onPaybillChange={handlePaybillNumChange}
          onAccountChange={handleAccountChange}
        />
      )}
    </View>
  )
}
