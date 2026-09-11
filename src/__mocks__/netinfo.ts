// @react-native-community/netinfo — runtime mock for jest (CJS).
// Provides a fake NetInfo that always reports connected.

export const addEventListener = () => ({ remove: () => {} })
export const fetch = () => Promise.resolve({ isConnected: true, networkStatus: 'WiFi' })
export const useNetInfo = () => ({ isConnected: true, isInternetReachable: true })
export const configure = () => {}
