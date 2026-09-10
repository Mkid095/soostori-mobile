// fidscript/instant-react mock for the cloud-auth-backend PERSON_NOT_FOUND tests.
// `init()` returns a mock db whose `transact`/`queryOnce` are spies
// exposed to the test via the shared state object below.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const state: any = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  employees: [] as any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shops: [] as any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  devices: [] as any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscriptions: [] as any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  packages: [] as any[],   // Phase 06: commercial packages
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  businesses: [] as any[], // Phase 06: enrolled businesses
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shopCreateCount: 0,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deviceCreateCount: 0,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authUserForMagicCode: null as { id: string; email: string } | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authUserForGoogle: null as { id: string; email: string } | null,
  reset() {
    this.employees = []
    this.shops = []
    this.devices = []
    this.subscriptions = []
    this.packages = []
    this.businesses = []
    this.shopCreateCount = 0
    this.deviceCreateCount = 0
    this.authUserForMagicCode = null
    this.authUserForGoogle = null
  },
}

export const __testState = state

// Chainable stub for `i.string().unique().indexed()` etc.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chainable: any = new Proxy(function () { return chainable }, {
  get(_t, prop) {
    if (prop === 'then') return undefined
    if (prop === Symbol.toPrimitive) return undefined
    return chainable
  },
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const txProxy: any = new Proxy({}, {
  get(_t, entity: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Proxy({}, {
      get(_t2, id: string) {
        return {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create(data: any) {
            if (entity === 'shops') state.shopCreateCount += 1
            if (entity === 'devices') state.deviceCreateCount += 1
            return { __create: true, entity, id, data }
          },
        }
      },
    })
  },
})

const mockDb = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  auth: {
    async sendMagicCode({ email }: { email: string }) {
      if (!email || !email.includes('@')) throw new Error('bad email')
    },
    async signInWithMagicCode({ email, code }: { email: string; code: string }) {
      if (!code || code.length < 6) throw new Error('bad code')
      return { user: state.authUserForMagicCode ?? { id: 'user_mc_1', email } }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signInWithGoogle({ idToken }: { idToken: string }) {
      if (!idToken) throw new Error('bad idToken')
      return { user: state.authUserForGoogle ?? { id: 'user_gg_1', email: 'goog@example.com' } }
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async queryOnce(query: any) {
    if ('employees' in query) return { data: { employees: state.employees } }
    if ('shops' in query) return { data: { shops: state.shops } }
    if ('devices' in query) return { data: { devices: state.devices } }
    if ('subscriptions' in query) return { data: { subscriptions: state.subscriptions } }
    if ('packages' in query) return { data: { packages: state.packages } }
    if ('businesses' in query) return { data: { businesses: state.businesses } }
    return { data: {} }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async transact(_tx: any) {
    // The proxy above already counts creates via getter side-effects.
  },
  tx: txProxy,
}

export const init = () => mockDb
export const i = new Proxy({}, { get: () => chainable })
export const id = () => `id_${Math.random().toString(36).slice(2, 10)}`
export const tx = txProxy
export const lookup = () => undefined
export default { init, i, id, tx, lookup, __testState }
