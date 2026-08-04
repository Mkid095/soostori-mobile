// Styles for CategoryPickerModal
import { StyleSheet } from 'react-native'

export const categoryPickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', padding: 20,
  },
  sheet: {
    backgroundColor: '#fff', borderRadius: 16, maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  title: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: 12, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a' },
  list: { maxHeight: 300, paddingHorizontal: 12 },
  empty: {
    textAlign: 'center', color: '#94a3b8', fontSize: 14,
    paddingVertical: 20,
  },
  item: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 10, marginBottom: 4,
    borderWidth: 2, borderColor: 'transparent',
  },
  itemSelected: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
  },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  itemText: { flex: 1, fontSize: 15, color: '#0f172a', fontWeight: '500' },
  itemTextSelected: { color: '#f97316', fontWeight: '700' },
  checkBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#f97316', justifyContent: 'center', alignItems: 'center',
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 8, padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#f97316', borderStyle: 'dashed',
  },
  addBtnText: { color: '#f97316', fontSize: 14, fontWeight: '700' },
  createRow: {
    flexDirection: 'row', gap: 8, marginTop: 8,
  },
  createInput: {
    flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a',
  },
  createBtn: {
    backgroundColor: '#f97316', borderRadius: 10, paddingHorizontal: 16,
    justifyContent: 'center',
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
