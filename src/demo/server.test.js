const { createDemoServer } = require('./server')
const { memoryStorage } = require('./storage')
const { DEMO_BASE, DEMO_WAYBILL } = require('./seed')

const shipment = `${DEMO_BASE}/logistics-objects/shipment-1c77`

describe('demo server', () => {
    let server

    beforeEach(() => { server = createDemoServer(memoryStorage()) })

    it('serves a seeded object with revision headers', () => {
        const res = server.handle('GET', DEMO_WAYBILL)
        expect(res.status).toBe(200)
        expect(res.headers['revision']).toBe('1')
        expect(res.headers['latest-revision']).toBe('1')
        expect(res.body['@type']).toBe('Waybill')
        expect(res.body['shipment']['@id']).toBe(shipment)
    })

    it('returns 404 for unknown objects', () => {
        expect(server.handle('GET', `${DEMO_BASE}/logistics-objects/nope`).status).toBe(404)
    })

    it('lists seeded events', () => {
        const res = server.handle('GET', `${DEMO_BASE}/logistics-objects/piece-1/logistics-events`)
        const items = res.body['https://onerecord.iata.org/ns/api#hasItem']
        expect(res.status).toBe(200)
        expect(items).toHaveLength(1)
        expect(items[0]['eventCode']['code']).toBe('RCF')
    })

    it('appends a posted event', () => {
        const uri = `${DEMO_BASE}/logistics-objects/piece-1`
        const res = server.handle('POST', `${uri}/logistics-events`, {
            '@type': 'cargo:LogisticsEvent',
            'cargo:eventName': 'Departed',
            'cargo:eventCode': { '@type': 'cargo:CodeListElement', 'cargo:code': 'DEP' },
            'cargo:eventDate': { '@value': '2026-08-27T10:00:00Z' },
            'cargo:eventTimeType': { '@id': 'cargo:ACTUAL' },
            'cargo:linkedObject': { '@id': uri },
        })
        expect(res.status).toBe(201)
        expect(res.headers['location']).toContain('/logistics-events/')
        const items = server.handle('GET', `${uri}/logistics-events`).body['https://onerecord.iata.org/ns/api#hasItem']
        expect(items).toHaveLength(2)
        expect(items[1]['eventCode']['code']).toBe('DEP')
        expect(items[1]['eventTimeType']['@id']).toBe('https://onerecord.iata.org/ns/cargo#ACTUAL')
    })

    it('applies a change and bumps the revision', () => {
        const change = {
            '@type': 'api:Change',
            'api:hasLogisticsObject': { '@id': shipment },
            'api:hasRevision': { '@value': '1' },
            'api:hasOperation': [
                { '@type': 'api:Operation', 'api:op': { '@id': 'api:DELETE' }, 'api:s': shipment, 'api:p': 'https://onerecord.iata.org/ns/cargo#goodsDescription', 'api:o': [{ 'api:hasValue': 'auto parts' }] },
                { '@type': 'api:Operation', 'api:op': { '@id': 'api:ADD' }, 'api:s': shipment, 'api:p': 'https://onerecord.iata.org/ns/cargo#goodsDescription', 'api:o': [{ 'api:hasValue': 'auto parts (verified)' }] },
            ],
        }
        const res = server.handle('PATCH', shipment, change)
        expect(res.status).toBe(201)
        expect(res.headers['location']).toContain('/action-requests/')

        expect(server.handle('PATCH', `${res.headers['location']}?status=REQUEST_ACCEPTED`).status).toBe(204)

        const after = server.handle('GET', shipment)
        expect(after.headers['revision']).toBe('2')
        expect(after.body['goodsDescription']).toBe('auto parts (verified)')

        const trail = server.handle('GET', `${shipment}/audit-trail`)
        expect(trail.body['hasChangeRequest']).toHaveLength(1)
    })

    it('re-seeds pristine after an applied change', () => {
        const change = {
            '@type': 'api:Change',
            'api:hasLogisticsObject': { '@id': shipment },
            'api:hasRevision': { '@value': '1' },
            'api:hasOperation': [
                { '@type': 'api:Operation', 'api:op': { '@id': 'api:DELETE' }, 'api:s': shipment, 'api:p': 'https://onerecord.iata.org/ns/cargo#goodsDescription', 'api:o': [{ 'api:hasValue': 'auto parts' }] },
                { '@type': 'api:Operation', 'api:op': { '@id': 'api:ADD' }, 'api:s': shipment, 'api:p': 'https://onerecord.iata.org/ns/cargo#goodsDescription', 'api:o': [{ 'api:hasValue': 'auto parts (verified)' }] },
            ],
        }
        const res = server.handle('PATCH', shipment, change)
        server.handle('PATCH', `${res.headers['location']}?status=REQUEST_ACCEPTED`)
        expect(server.handle('GET', shipment).body['goodsDescription']).toBe('auto parts (verified)')

        const fresh = createDemoServer(memoryStorage())
        expect(fresh.handle('GET', shipment).body['goodsDescription']).toBe('auto parts')
    })

    it('creates an object and returns its location', () => {
        const res = server.handle('POST', `${DEMO_BASE}/logistics-objects`, { '@type': 'cargo:Piece' })
        expect(res.status).toBe(201)
        const created = server.handle('GET', res.headers['location'])
        expect(created.status).toBe(200)
        expect(created.body['@type']).toBe('Piece')
    })

    it('persists mutations through storage', () => {
        const storage = memoryStorage()
        const first = createDemoServer(storage)
        first.handle('POST', `${DEMO_BASE}/logistics-objects/piece-1/logistics-events`, {
            '@type': 'cargo:LogisticsEvent',
            'cargo:eventCode': { 'cargo:code': 'ARR' },
            'cargo:eventDate': { '@value': '2026-08-27T12:00:00Z' },
        })
        const second = createDemoServer(storage)
        const items = second.handle('GET', `${DEMO_BASE}/logistics-objects/piece-1/logistics-events`).body['https://onerecord.iata.org/ns/api#hasItem']
        expect(items).toHaveLength(2)
    })

    it('lists objects by type via internal/_all', () => {
        const res = server.handle('GET', `${DEMO_BASE}/logistics-objects/internal/_all?limit=20&offset=0&t=${encodeURIComponent('https://onerecord.iata.org/ns/cargo#Piece')}`)
        expect(res.status).toBe(200)
        expect(res.body['@graph'].length).toBeGreaterThan(1)
        for (const item of res.body['@graph']) expect(item['@type']).toBe('Piece')
    })

    it('returns a bare object for a single _all match', () => {
        const res = server.handle('GET', `${DEMO_BASE}/logistics-objects/internal/_all?t=${encodeURIComponent('https://onerecord.iata.org/ns/cargo#Waybill')}`)
        expect(res.body['@graph']).toBeUndefined()
        expect(res.body['@type']).toBe('Waybill')
    })

    it('returns an empty body when _all matches nothing', () => {
        const res = server.handle('GET', `${DEMO_BASE}/logistics-objects/internal/_all?t=${encodeURIComponent('https://onerecord.iata.org/ns/cargo#DgDeclaration')}`)
        expect(res.status).toBe(200)
        expect(res.body).toEqual({})
    })

    it('applies limit and offset to _all', () => {
        const all = server.handle('GET', `${DEMO_BASE}/logistics-objects/internal/_all?t=${encodeURIComponent('https://onerecord.iata.org/ns/cargo#Piece')}`)
        const page = server.handle('GET', `${DEMO_BASE}/logistics-objects/internal/_all?limit=1&offset=1&t=${encodeURIComponent('https://onerecord.iata.org/ns/cargo#Piece')}`)
        expect(page.body['@id']).toBe(all.body['@graph'][1]['@id'])
    })
})
