// ShopSettingsForm — shop details + receipt footer form content
import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

interface Props {
  onClose: () => void
}

export function ShopSettingsForm({ onClose }: Props) {
  const { text, textSecondary, card: cardBg, border, brand } = useTheme()
  const [shopName, setShopName] = useState('My Shop')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [lowStock, setLowStock] = useState('10')
  const [footer, setFooter] = useState('')
  const inputStyle = { backgroundColor: cardBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: text, borderWidth: 1, borderColor: border }

  return (
    <View style={{ gap: 16 }}>
      <View style={{ backgroundColor: cardBg, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 14 }}>Shop Details</Text>
        <View style={{ gap: 12 }}>
          {([
            { label: 'Shop Name', value: shopName, set: setShopName, placeholder: 'My Shop' },
            { label: 'Address', value: address, set: setAddress, placeholder: '123 Main Street, City' },
            { label: 'Phone', value: phone, set: setPhone, placeholder: '+254 700 000 000' },
            { label: 'Low Stock Alert', value: lowStock, set: setLowStock, placeholder: '10' },
          ] as const).map(({ label, value, set, placeholder }) => (
            <View key={label}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginBottom: 6 }}>{label}</Text>
              <TextInput style={inputStyle} value={value} onChangeText={set} placeholder={placeholder} placeholderTextColor={textSecondary} />
            </View>
          ))}
        </View>
      </View>

      <View style={{ backgroundColor: cardBg, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 14 }}>Receipt</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginBottom: 6 }}>Footer Message</Text>
        <TextInput style={{ ...inputStyle, marginBottom: 0 }} value={footer} onChangeText={setFooter} placeholder="Thank you for shopping!" placeholderTextColor={textSecondary} />
      </View>

      <TouchableOpacity style={{ backgroundColor: brand, borderRadius: 12, paddingVertical: 16, alignItems: 'center' }} onPress={onClose}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Save Settings</Text>
      </TouchableOpacity>
    </View>
  )
}
