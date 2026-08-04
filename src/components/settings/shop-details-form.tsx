// ShopDetailsForm — shop name, address, phone, low stock fields
// Pure presentation: no business logic.

import { View, Text, TextInput } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

interface Props {
  shopName: string
  address: string
  phone: string
  lowStock: string
  footer: string
  onShopName: (v: string) => void
  onAddress: (v: string) => void
  onPhone: (v: string) => void
  onLowStock: (v: string) => void
  onFooter: (v: string) => void
}

export function ShopDetailsForm({ shopName, address, phone, lowStock, footer, onShopName, onAddress, onPhone, onLowStock, onFooter }: Props) {
  const { card, text, textSecondary: textMuted, border, bg } = useTheme()
  const inputStyle = { backgroundColor: bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: text, borderWidth: 1, borderColor: border }

  return (
    <>
      <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 14 }}>Shop Details</Text>
        <View style={{ gap: 12 }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 6 }}>Shop Name</Text>
            <TextInput style={inputStyle} value={shopName} onChangeText={onShopName} placeholder="My Shop" placeholderTextColor={textMuted} />
          </View>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 6 }}>Address</Text>
            <TextInput style={inputStyle} value={address} onChangeText={onAddress} placeholder="123 Main Street, City" placeholderTextColor={textMuted} />
          </View>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 6 }}>Phone</Text>
            <TextInput style={inputStyle} value={phone} onChangeText={onPhone} placeholder="+254 700 000 000" placeholderTextColor={textMuted} keyboardType="phone-pad" />
          </View>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 6 }}>Low Stock Alert Threshold</Text>
            <TextInput style={inputStyle} value={lowStock} onChangeText={onLowStock} placeholder="10" placeholderTextColor={textMuted} keyboardType="number-pad" />
          </View>
        </View>
      </View>
      <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 14 }}>Receipt</Text>
        <View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 6 }}>Footer Message</Text>
          <TextInput style={inputStyle} value={footer} onChangeText={onFooter} placeholder="Thank you for shopping!" placeholderTextColor={textMuted} />
        </View>
      </View>
    </>
  )
}
