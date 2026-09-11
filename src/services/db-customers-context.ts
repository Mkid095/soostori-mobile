// db-customers-context.ts — AsyncStorage context for customer operations
import AsyncStorage from '@react-native-async-storage/async-storage'

const SHOP_ID_KEY = '@soostori:shopId'
const EMPLOYEE_ID_KEY = '@soostori:employeeId'
const DEVICE_ID_KEY = '@soostori:deviceId'

/** Resolve current shopId from AsyncStorage. Throws if not set. */
export async function resolveCustomerShopId(): Promise<string> {
  const stored = await AsyncStorage.getItem(SHOP_ID_KEY)
  if (!stored) throw new Error('No shop context — cannot mutate customers')
  return stored
}

/** Resolve current employeeId, or 'system' if not set. */
export async function resolveCustomerEmployeeId(): Promise<string> {
  return (await AsyncStorage.getItem(EMPLOYEE_ID_KEY)) ?? 'system'
}

/** Resolve current deviceId, or 'mobile' if not set. */
export async function resolveCustomerDeviceId(): Promise<string> {
  return (await AsyncStorage.getItem(DEVICE_ID_KEY)) ?? 'mobile'
}
