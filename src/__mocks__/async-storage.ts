// In-memory AsyncStorage mock
const store = new Map<string, string>()
export const getItem = async (k: string) => store.get(k) ?? null
export const setItem = async (k: string, v: string) => { store.set(k, v) }
export const removeItem = async (k: string) => { store.delete(k) }
export const multiSet = async (pairs: Array<[string, string]>) => { for (const [k, v] of pairs) store.set(k, v) }
export const multiRemove = async (ks: string[]) => { for (const k of ks) store.delete(k) }
export const clear = async () => { store.clear() }
export default { getItem, setItem, removeItem, multiSet, multiRemove, clear }
