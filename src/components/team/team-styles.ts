// team-styles.ts — Phase 14: Shared styles for team components
export const teamStyles = {
  header: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0', gap: 10,
  },
  headerIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F97316', justifyContent: 'center' as const, alignItems: 'center' as const,
  },
  headerTitle: { fontSize: 16, fontWeight: '800' as const, color: '#0F172A' },
  tabRow: { flexDirection: 'row' as const, paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' as const,
    backgroundColor: '#F1F5F9',
  },
  tabActive: { backgroundColor: '#F97316' },
  tabText: { fontSize: 13, fontWeight: '700' as const, textTransform: 'capitalize' as const },
  tabTextActive: { color: '#fff' },
  tabTextInactive: { color: '#64748B' },
  fab: {
    position: 'absolute' as const, right: 16, bottom: 16,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#F97316', justifyContent: 'center' as const, alignItems: 'center' as const,
    shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8, zIndex: 10,
  },
  center: { alignItems: 'center' as const, paddingTop: 40 },
  error: { color: '#EF4444', fontSize: 14 },
  emptyTitle: { marginTop: 10, fontWeight: '600' as const, color: '#94A3B8', fontSize: 14 },
  emptySub: { marginTop: 4, fontSize: 12, color: '#94A3B8' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14,
  },
  memberRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F1F5F9', justifyContent: 'center' as const, alignItems: 'center' as const,
  },
  avatarText: { fontSize: 16, fontWeight: '700' as const, color: '#64748B' },
  memberName: { fontWeight: '700' as const, fontSize: 14, color: '#0F172A' },
  memberEmail: { fontSize: 12, color: '#94A3B8' },
  actions: {
    flexDirection: 'row' as const, marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 8,
  },
  actionBtn: {
    flex: 1, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center' as const,
  },
  actionBtnText: { fontSize: 12, fontWeight: '600' as const, color: '#64748B' },
  actionBtnDanger: { borderColor: '#FEE2E2' },
  actionBtnDangerText: { fontSize: 12, fontWeight: '600' as const, color: '#EF4444' },
  iconBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#FEF2F2', justifyContent: 'center' as const, alignItems: 'center' as const,
  },
}
