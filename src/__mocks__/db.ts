// Mock for src/lib/db — provides the SQLite handle used by db-cloud-device
// (and other DB-backed services) during jest tests. Returns a stub that
// no-ops every call so the cloud-auth-backend test never touches SQLite.
export const getDb = async () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runAsync: async (_sql: string, _params?: any[]) => ({ rowsAffected: 0, rows: [], insertId: 0 }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAllAsync: async <T = any>(_sql: string, _params?: any[]) => [] as T[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getFirstAsync: async <T = any>(_sql: string, _params?: any[]) => null as T | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execAsync: async (_sql: string) => undefined,
  withTransactionAsync: async (fn: () => Promise<unknown>) => fn(),
  closeAsync: async () => undefined,
})
