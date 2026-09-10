// Minimal RN mock — only what jest needs to load the source files
// without crashing on Flow syntax or native bridge calls.
export const Platform = { OS: 'android', select: (o: any) => o.android ?? o.default }
export const StyleSheet = { create: (s: any) => s, flatten: (s: any) => s }
export const View = 'View'
export const Text = 'Text'
export const TouchableOpacity = 'TouchableOpacity'
export const ActivityIndicator = 'ActivityIndicator'
export const Animated = { Value: function () { return {} }, timing: () => ({ start: () => undefined }), sequence: () => ({ start: () => undefined }) }
export const Alert = { alert: () => undefined }
export const Linking = { openURL: () => Promise.resolve() }
export const Dimensions = { get: () => ({ width: 360, height: 640 }) }
export default { Platform, StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Animated, Alert, Linking, Dimensions }
