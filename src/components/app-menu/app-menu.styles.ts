// app-menu.styles.ts — isolated styles for AppMenu
import { StyleSheet } from 'react-native'
import { colors } from '../../lib/theme'

export const makeStyles = () => StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  backdropTouch: {
    flex: 1,
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
    zIndex: 5,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 6,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.muted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginHorizontal: 12,
    borderRadius: 14,
    marginBottom: 2,
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  navText: {
    flex: 1,
  },
  navLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  activeBar: {
    height: 2,
    borderRadius: 1,
    marginTop: 3,
    width: 32,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 4,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    borderRadius: 12,
  },
  footerLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
})