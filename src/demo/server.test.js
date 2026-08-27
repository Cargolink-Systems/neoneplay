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
        expect(res.body['@type']).toBe('https://onerecord.iata.org/ns/cargo#Waybill')
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

    it('returns 404 when posting an event for an unknown object', () => {
        const res = server.handle('POST', `${DEMO_BASE}/logistics-objects/nope/logistics-events`, {
            '@type': 'cargo:LogisticsEvent',
        })
        expect(res.status).toBe(404)
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

    it('replaces a code-list value keeping its IRI shape', () => {
        const subject = 'demo:gw-piece-1'
        const piece = `${DEMO_BASE}/logistics-objects/piece-1`
        server.handle('PATCH', piece, {
            'api:hasOperation': [
                { 'api:op': { '@id': 'api:DELETE' }, 'api:s': subject, 'api:p': 'https://onerecord.iata.org/ns/cargo#unit', 'api:o': [{ 'api:hasValue': 'KGM' }] },
                { 'api:op': { '@id': 'api:ADD' }, 'api:s': subject, 'api:p': 'https://onerecord.iata.org/ns/cargo#unit', 'api:o': [{ 'api:hasValue': 'LBR' }] },
            ],
        })
        const unit = server.handle('GET', piece).body['grossWeight']['unit']
        expect(unit).toEqual({ '@id': 'https://onerecord.iata.org/ns/coreCodeLists#MeasurementUnitCode_LBR' })
    })

    it('replaces a link value keeping its @id shape', () => {
        const waybill = DEMO_WAYBILL
        const target = `${DEMO_BASE}/logistics-objects/shipment-1c77`
        server.handle('PATCH', waybill, {
            'api:hasOperation': [
                { 'api:op': { '@id': 'api:DELETE' }, 'api:s': waybill, 'api:p': 'https://onerecord.iata.org/ns/cargo#shipment', 'api:o': [{ 'api:hasValue': target }] },
                { 'api:op': { '@id': 'api:ADD' }, 'api:s': waybill, 'api:p': 'https://onerecord.iata.org/ns/cargo#shipment', 'api:o': [{ 'api:hasValue': `${DEMO_BASE}/logistics-objects/other` }] },
            ],
        })
        expect(server.handle('GET', waybill).body['shipment']).toEqual({ '@id': `${DEMO_BASE}/logistics-objects/other` })
    })

    it('creates an embedded object from a blank-node add with its sub-operations', () => {
        const piece = `${DEMO_BASE}/logistics-objects/piece-1`
        server.handle('PATCH', piece, {
            'api:hasOperation': [
                { 'api:op': { '@id': 'api:ADD' }, 'api:s': piece, 'api:p': 'https://onerecord.iata.org/ns/cargo#dimensions', 'api:o': [{ 'api:hasDatatype': 'https://onerecord.iata.org/ns/cargo#Dimensions', 'api:hasValue': '_:b12345' }] },
                { 'api:op': { '@id': 'api:ADD' }, 'api:s': '_:b12345', 'api:p': 'https://onerecord.iata.org/ns/cargo#height', 'api:o': [{ 'api:hasDatatype': 'http://www.w3.org/2001/XMLSchema#double', 'api:hasValue': '1.0' }] },
            ],
        })
        const dimensions = server.handle('GET', piece).body['dimensions']
        expect(dimensions['@type']).toBe('Dimensions')
        expect(dimensions['@id']).toMatch(/^demo:new-/)
        expect(dimensions['height']).toEqual({ '@value': '1.0' })
    })

    it('shapes a fresh link add as an @id object', () => {
        const piece = `${DEMO_BASE}/logistics-objects/piece-1`
        const uld = `${DEMO_BASE}/logistics-objects/uld-ake12345`
        server.handle('PATCH', piece, {
            'api:hasOperation': [
                { 'api:op': { '@id': 'api:ADD' }, 'api:s': piece, 'api:p': 'https://onerecord.iata.org/ns/cargo#inUld', 'api:o': [{ 'api:hasDatatype': 'https://onerecord.iata.org/ns/cargo#ULD', 'api:hasValue': uld }] },
            ],
        })
        expect(server.handle('GET', piece).body['inUld']).toEqual({ '@id': uld })
    })

    it('shapes a fresh literal add by its datatype', () => {
        const piece = `${DEMO_BASE}/logistics-objects/piece-1`
        server.handle('PATCH', piece, {
            'api:hasOperation': [
                { 'api:op': { '@id': 'api:ADD' }, 'api:s': piece, 'api:p': 'https://onerecord.iata.org/ns/cargo#coload', 'api:o': [{ 'api:hasDatatype': 'http://www.w3.org/2001/XMLSchema#boolean', 'api:hasValue': 'true' }] },
                { 'api:op': { '@id': 'api:ADD' }, 'api:s': piece, 'api:p': 'https://onerecord.iata.org/ns/cargo#upid', 'api:o': [{ 'api:hasDatatype': 'http://www.w3.org/2001/XMLSchema#string', 'api:hasValue': 'UP-1' }] },
            ],
        })
        const body = server.handle('GET', piece).body
        expect(body['coload']).toEqual({ '@value': 'true' })
        expect(body['upid']).toBe('UP-1')
    })

    it('skips operations whose subject does not resolve', () => {
        server.handle('PATCH', shipment, {
            'api:hasOperation': [
                { 'api:op': { '@id': 'api:DELETE' }, 'api:s': 'demo:nope', 'api:p': 'https://onerecord.iata.org/ns/cargo#goodsDescription', 'api:o': [{ 'api:hasValue': 'auto parts' }] },
            ],
        })
        expect(server.handle('GET', shipment).body['goodsDescription']).toBe('auto parts')
    })

    it('serves the pre-change body for ?at= of an older revision', () => {
        server.handle('PATCH', shipment, {
            'api:hasOperation': [
                { 'api:op': { '@id': 'api:DELETE' }, 'api:s': shipment, 'api:p': 'https://onerecord.iata.org/ns/cargo#goodsDescription', 'api:o': [{ 'api:hasValue': 'auto parts' }] },
                { 'api:op': { '@id': 'api:ADD' }, 'api:s': shipment, 'api:p': 'https://onerecord.iata.org/ns/cargo#goodsDescription', 'api:o': [{ 'api:hasValue': 'auto parts (verified)' }] },
            ],
        })
        const request = server.handle('GET', `${shipment}/audit-trail`).body['hasChangeRequest'][0]
        const at = request['isRequestedAt']['@value'].split('.')[0].replaceAll('-', '').replaceAll(':', '') + 'Z'
        const res = server.handle('GET', `${shipment}?at=${at}`)
        expect(res.body['goodsDescription']).toBe('auto parts')
        expect(res.headers['revision']).toBe('1')
        expect(res.headers['latest-revision']).toBe('2')
    })

    it('reset restores the seed', () => {
        server.handle('PATCH', shipment, {
            'api:hasOperation': [
                { 'api:op': { '@id': 'api:DELETE' }, 'api:s': shipment, 'api:p': 'https://onerecord.iata.org/ns/cargo#goodsDescription', 'api:o': [{ 'api:hasValue': 'auto parts' }] },
            ],
        })
        server.reset()
        expect(server.handle('GET', shipment).body['goodsDescription']).toBe('auto parts')
        expect(server.handle('GET', shipment).headers['revision']).toBe('1')
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
        for (const item of res.body['@graph']) expect(item['@type']).toBe('https://onerecord.iata.org/ns/cargo#Piece')
    })

    it('returns a bare object for a single _all match', () => {
        const res = server.handle('GET', `${DEMO_BASE}/logistics-objects/internal/_all?t=${encodeURIComponent('https://onerecord.iata.org/ns/cargo#Waybill')}`)
        expect(res.body['@graph']).toBeUndefined()
        expect(res.body['@type']).toBe('https://onerecord.iata.org/ns/cargo#Waybill')
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

describe('seed timestamps', () => {
    it('are recent, ordered, and second-precision ISO', () => {
        const { seedBlob } = require('./seed')
        const blob = seedBlob()
        const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
        const rcf = blob.events[`${DEMO_BASE}/logistics-objects/piece-1`][0].eventDate['@value']
        const dep = blob.events[`${DEMO_BASE}/logistics-objects/movement-av241`][0].eventDate['@value']
        expect(rcf).toMatch(iso)
        expect(dep).toMatch(iso)
        expect(new Date(rcf) < new Date(dep)).toBe(true)
        expect(Date.now() - new Date(dep).getTime()).toBeLessThan(24 * 3600 * 1000)
    })
})
