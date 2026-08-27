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

    it('dropServer removes the server with the host', () => {
        const { upsertServer, dropServer } = useInternalStore.getState()
        upsertServer({ org_name: 'A', host: 'a:8080', token: 't1', color: '#fff', protocol: 'http' })
        upsertServer({ org_name: 'B', host: 'b:8080', token: 't2', color: '#fff', protocol: 'http' })
        dropServer('a:8080')
        const servers = useInternalStore.getState().servers
        expect(servers).toHaveLength(1)
        expect(servers[0].host).toBe('b:8080')
    })
})
