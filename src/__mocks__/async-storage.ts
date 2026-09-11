// In-memory AsyncStorage mock — shared state via global
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalStore: Map<string, string> = (global as any).__asyncStorageStore__ ?? new Map()
;(global as any).__asyncStorageStore__ = globalStore

export const getItem = async (k: string) => globalStore.get(k) ?? null
export const setItem = async (k: string, v: string) => { globalStore.set(k, v) }
export const removeItem = async (k: string) => { globalStore.delete(k) }
export const multiSet = async (pairs: Array<[string, string]>) => { for (const [k, v] of pairs) globalStore.set(k, v) }
export const multiRemove = async (ks: string[]) => { for (const k of ks) globalStore.delete(k) }
export const clear = async () => { globalStore.clear() }
export default { getItem, setItem, removeItem, multiSet, multiRemove, clear }
