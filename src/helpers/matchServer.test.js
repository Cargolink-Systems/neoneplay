const matchServer = require('./matchServer').default

const servers = [
    { host: 'a:8080', org_name: 'A' },
    { host: 'b:8080', org_name: 'B' },
]

describe('matchServer', () => {
    it('matches the server whose host prefixes the uri host', () => {
        expect(matchServer(servers, 'http://b:8080/logistics-objects/1').org_name).toBe('B')
    })

    it('matches uris with query suffixes', () => {
        expect(matchServer(servers, 'http://a:8080/logistics-objects/1?at=20260101').org_name).toBe('A')
    })

    it('returns null for unknown hosts', () => {
        expect(matchServer(servers, 'http://c:8080/logistics-objects/1')).toBeNull()
    })
})
