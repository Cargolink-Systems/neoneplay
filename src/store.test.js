global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }

const useInternalStore = require('./store').default

describe('servers', () => {
    beforeEach(() => useInternalStore.getState().cleanServer())

    it('upsertServer adds a new server', () => {
        useInternalStore.getState().upsertServer({ org_name: 'A', host: 'a:8080', token: 't1', color: '#fff', protocol: 'http' })
        expect(useInternalStore.getState().servers).toHaveLength(1)
    })

    it('upsertServer replaces the server with the same host', () => {
        const { upsertServer } = useInternalStore.getState()
        upsertServer({ org_name: 'A', host: 'a:8080', token: 't1', color: '#fff', protocol: 'http' })
        upsertServer({ org_name: 'A', host: 'a:8080', token: 't2', color: '#fff', protocol: 'http' })
        const servers = useInternalStore.getState().servers
        expect(servers).toHaveLength(1)
        expect(servers[0].token).toBe('t2')
    })

    it('upsertServer keeps servers with other hosts', () => {
        const { upsertServer } = useInternalStore.getState()
        upsertServer({ org_name: 'A', host: 'a:8080', token: 't1', color: '#fff', protocol: 'http' })
        upsertServer({ org_name: 'B', host: 'b:8080', token: 't2', color: '#fff', protocol: 'http' })
        expect(useInternalStore.getState().servers).toHaveLength(2)
    })

    it('setServerAuthFailed flags only the matching server', () => {
        const { upsertServer, setServerAuthFailed } = useInternalStore.getState()
        upsertServer({ org_name: 'A', host: 'a:8080', token: 't1', color: '#fff', protocol: 'http' })
        upsertServer({ org_name: 'B', host: 'b:8080', token: 't2', color: '#fff', protocol: 'http' })
        setServerAuthFailed('a:8080', true)
        const servers = useInternalStore.getState().servers
        expect(servers.find((s) => s.host === 'a:8080').authFailed).toBe(true)
        expect(servers.find((s) => s.host === 'b:8080').authFailed).toBeUndefined()
    })

    it('setServerAuthFailed does not notify subscribers when the flag is unchanged', () => {
        const { upsertServer, setServerAuthFailed } = useInternalStore.getState()
        upsertServer({ org_name: 'A', host: 'a:8080', token: 't1', color: '#fff', protocol: 'http' })
        const before = useInternalStore.getState().servers
        const listener = jest.fn()
        const unsubscribe = useInternalStore.subscribe(listener)
        setServerAuthFailed('a:8080', false)
        unsubscribe()
        expect(useInternalStore.getState().servers).toBe(before)
        expect(listener).not.toHaveBeenCalled()
    })

    it('updateServerToken replaces the token and clears the failure flag', () => {
        const { upsertServer, setServerAuthFailed, updateServerToken } = useInternalStore.getState()
        upsertServer({ org_name: 'A', host: 'a:8080', token: 't1', color: '#fff', protocol: 'http' })
        setServerAuthFailed('a:8080', true)
        updateServerToken('a:8080', 't2')
        const server = useInternalStore.getState().servers[0]
        expect(server.token).toBe('t2')
        expect(server.authFailed).toBe(false)
    })
})
