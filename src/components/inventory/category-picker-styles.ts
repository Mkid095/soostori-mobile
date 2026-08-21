// Styles for CategoryPickerModal — layout/structure only; colors passed via props
import { StyleSheet } from 'react-native'

export const categoryPickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1, justifyContent: 'center', padding: 20,
  },
  sheet: {
    borderRadius: 16, maxHeight: '80%', overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: 12, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  list: { maxHeight: 300, paddingHorizontal: 12 },
  empty: {
    textAlign: 'center', fontSize: 14, paddingVertical: 20,
  },
  item: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 10, marginBottom: 4,
    borderWidth: 2,
  },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  itemText: { flex: 1, fontSize: 15, fontWeight: '500' },
  checkBadge: {
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 8, padding: 12, borderRadius: 10,
    borderWidth: 1, borderStyle: 'dashed',
  },
  addBtnText: { fontSize: 14, fontWeight: '700' },
  createRow: {
    flexDirection: 'row', gap: 8, marginTop: 8,
  },
  createInput: {
    flex: 1, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  createBtn: {
    borderRadius: 10, paddingHorizontal: 16,
    justifyContent: 'center',
  },
  createBtnText: { fontWeight: '700', fontSize: 14 },
})
