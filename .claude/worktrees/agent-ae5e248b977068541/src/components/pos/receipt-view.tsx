import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { Printer, Share2, X } from 'lucide-react-native'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { useTheme } from '../../hooks/useTheme'
import type { ReceiptData } from '../../services/db-receipts'
import { generateReceiptHTML } from '../../services/db-receipts'

interface Props {
  receipt: ReceiptData
  onClose: () => void
}

export function ReceiptView({ receipt, onClose }: Props) {
  const { card, text, border, brand } = useTheme()
  const [printing, setPrinting] = useState(false)

  async function handlePrint() {
    setPrinting(true)
    try {
      await Print.printAsync({ html: generateReceiptHTML(receipt) })
    } catch (e) {
      Alert.alert('Print Error', String(e))
    } finally {
      setPrinting(false)
    }
  }

  async function handleShare() {
    try {
      const { uri } = await Print.printToFileAsync({ html: generateReceiptHTML(receipt) })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri)
      } else {
        Alert.alert('Sharing not available')
      }
    } catch (e) {
      Alert.alert('Share Error', String(e))
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: card }]}>
      <View style={[styles.header, { borderBottomColor: border }]}>
        <Text style={[styles.title, { color: text }]}>Receipt</Text>

        <TouchableOpacity onPress={onClose}><X size={20} color={text} /></TouchableOpacity>
      </View>

      <ScrollView style={styles.body}>
        <View style={[styles.receiptPreview, { backgroundColor: '#fff', borderColor: border }]}>
          <Text style={styles.shopName}>{receipt.shopName}</Text>
          {receipt.shopAddress && <Text style={styles.meta}>{receipt.shopAddress}</Text>}
          {receipt.shopPhone && <Text style={styles.meta}>{receipt.shopPhone}</Text>}
          <Text style={[styles.receiptNo, { color: text }]}>No: {receipt.receiptNumber}</Text>
          <Text style={[styles.receiptNo, { color: text }]}>Date: {receipt.date}</Text>
          <View style={styles.divider} />
          {receipt.items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: text }]}>{item.name}</Text>
                <Text style={[styles.itemMeta, { color: text }]}>{item.quantity} x {item.unitPrice.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</Text>
              </View>
              <Text style={[styles.itemTotal, { color: text }]}>{item.total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: text }]}>TOTAL</Text>
            <Text style={[styles.totalValue, { color: brand }]}>KES {receipt.total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</Text>
          </View>
          <Text style={[styles.method, { color: text }]}>Paid by: {receipt.paymentMethod}</Text>
          {receipt.footerMessage && <Text style={styles.footer}>{receipt.footerMessage}</Text>}
        </View>
      </ScrollView>

      <View style={[styles.actions, { borderTopColor: border }]}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: border }]} onPress={handleShare} disabled={printing}>

          <Share2 size={18} color={text} />
          <Text style={[styles.btnText, { color: text }]}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: brand }]} onPress={handlePrint} disabled={printing}>

          <Printer size={18} color="#fff" />
          <Text style={[styles.btnText, { color: '#fff' }]}>{printing ? 'Printing...' : 'Print'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { borderRadius: 16, overflow: 'hidden', maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '800' },
  body: { maxHeight: 400 },
  receiptPreview: { margin: 16, padding: 16, borderWidth: 1, borderStyle: 'dashed', borderRadius: 8 },
  shopName: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  meta: { fontSize: 10, textAlign: 'center', color: '#666' },
  receiptNo: { fontSize: 11, marginTop: 4 },
  divider: { borderTopWidth: 1, borderStyle: 'dashed', marginVertical: 8 },
  itemRow: { flexDirection: 'row', marginVertical: 2 },
  itemName: { fontSize: 11, fontWeight: '600' },
  itemMeta: { fontSize: 10 },
  itemTotal: { fontSize: 11, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  totalLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  totalValue: { fontSize: 16, fontWeight: '800' },
  method: { fontSize: 11, marginTop: 4, textAlign: 'right' },
  footer: { fontSize: 9, textAlign: 'center', color: '#666', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  btnText: { fontSize: 14, fontWeight: '700' },
})
